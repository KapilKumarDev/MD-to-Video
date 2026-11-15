import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parse/index.ts';
import {
  BLOCK_ANIMS,
  BLOCK_ATTRIBUTES,
  CHART_ANIM,
  HEADING_NAMES,
  THEME_DEFAULTS,
} from '../../src/parse/schema.ts';
import limits from '../../config/limits.json' with { type: 'json' };
import { ScriptError } from '../../src/types.ts';

const ctx = { file: 'talk.md', root: '/project' };

const failure = (markdown: string): ScriptError => {
  try {
    parse(markdown, ctx);
  } catch (error) {
    if (error instanceof ScriptError) return error;
    throw error;
  }
  throw new Error('expected parse to fail');
};

/** A one-scene script whose frontmatter starts on line 2. */
const withFrontmatter = (...lines: string[]): string =>
  ['---', ...lines, '---', '', '## Scene', 'Hello.', ''].join('\n');

describe('parse: scenes', () => {
  it('parse_minimal_script_gives_two_scenes', () => {
    const deck = parse(
      ['## First idea', 'Hello there.', '', '## Second idea', 'Goodbye now.', ''].join('\n'),
      ctx,
    );

    expect(deck).toEqual({
      meta: {
        title: 'talk',
        voice: 'en_US-lessac-medium',
        theme: 'midnight',
        fps: 30,
        size: '1080p',
        pad: 0.6,
      },
      scenes: [
        {
          index: 0,
          line: 1,
          title: 'First idea',
          narration: 'Hello there.',
          entrance: 'kinetic',
          emphasis: 'none',
          transition: 'fade',
          bg: 'gradient-drift',
          blocks: [],
        },
        {
          index: 1,
          line: 4,
          title: 'Second idea',
          narration: 'Goodbye now.',
          entrance: 'kinetic',
          emphasis: 'none',
          transition: 'fade',
          bg: 'gradient-drift',
          blocks: [],
        },
      ],
    });
  });
});

describe('parse: frontmatter', () => {
  it.each([
    ['title', 'title: Hello world', { title: 'Hello world' }],
    ['voice', 'voice: en_GB-alan-medium', { voice: 'en_GB-alan-medium' }],
    ['theme', 'theme: daylight', { theme: 'daylight' }],
    ['fps', 'fps: 60', { fps: 60 }],
    ['size', 'size: vertical', { size: 'vertical' }],
    ['music', 'music: assets/theme.mp3', { music: 'assets/theme.mp3' }],
    ['pad (lowest)', 'pad: 0', { pad: 0 }],
    ['pad (highest)', 'pad: 3', { pad: 3 }],
  ])('accepts a valid %s', (_key, yaml, expected) => {
    expect(parse(withFrontmatter(yaml), ctx).meta).toMatchObject(expected);
  });

  it.each([
    ['title', 'title: 2026', '"title" must be text, got 2026'],
    ['voice', 'voice: ../evil', '"voice" must be a voice id such as en_US-lessac-medium, got "../evil"'],
    ['theme', 'theme: neon', '"theme" must be one of midnight, daylight, high-contrast, got "neon"'],
    ['fps', 'fps: 25', '"fps" must be one of 24, 30, 60, got 25'],
    ['size', 'size: 4k', '"size" must be one of 1080p, 720p, square, vertical, got "4k"'],
    ['music', 'music: 5', '"music" must be a file path, got 5'],
    ['pad', 'pad: 4', '"pad" must be a number from 0 to 3, got 4'],
  ])('rejects an invalid %s on its own line', (_key, yaml, problem) => {
    expect(failure(withFrontmatter('# a comment', yaml)).message).toBe(
      `talk.md: line 3: frontmatter ${problem}`,
    );
  });

  it('rejects an unknown key and lists the valid ones', () => {
    expect(failure(withFrontmatter('colour: red')).message).toBe(
      'talk.md: line 2: frontmatter has unknown key "colour"; valid keys: title, voice, theme, fps, size, music, pad',
    );
  });

  it('rejects a repeated key at the second occurrence', () => {
    const error = failure(withFrontmatter('fps: 24', 'fps: 30'));

    expect(error.line).toBe(3);
    expect(error.message).toContain('unique');
  });

  it('rejects frontmatter that is not key: value pairs', () => {
    expect(failure(withFrontmatter('- a', '- b')).message).toBe(
      'talk.md: line 2: frontmatter must be key: value pairs',
    );
  });

  it('reports broken YAML at its line', () => {
    expect(failure(withFrontmatter('fps: 24', 'title: [unclosed')).line).toBe(3);
  });

  it('treats empty frontmatter as all defaults', () => {
    expect(parse(withFrontmatter(), ctx).meta).toEqual(parse('## Scene\nHello.\n', ctx).meta);
  });

  it.each([
    ['midnight', 'kinetic', 'fade', 'gradient-drift'],
    ['daylight', 'slide-up', 'slide-left', 'none'],
    ['high-contrast', 'word-fade', 'fade', 'none'],
  ])('gives %s scenes the theme defaults', (theme, entrance, transition, bg) => {
    const scene = parse(withFrontmatter(`theme: ${theme}`), ctx).scenes[0];

    expect(scene).toMatchObject({ entrance, emphasis: 'none', transition, bg });
  });
});

describe('parse: scene rules', () => {
  it('joins paragraphs with a blank line and speaks the plain text', () => {
    const scene = parse(
      '## A\nFirst **bold** line\nwraps here.\n\nSecond `code` paragraph.\n',
      ctx,
    ).scenes[0];

    expect(scene?.narration).toBe('First bold line wraps here.\n\nSecond code paragraph.');
  });

  it('rejects a # heading and points to the title key', () => {
    expect(failure('# Whole video\n\n## A\nHi.\n').message).toBe(
      'talk.md: line 1: "#" headings are not scenes; set the video title with "title" in the frontmatter',
    );
  });

  it('rejects a ### heading', () => {
    expect(failure('## A\nHi.\n\n### Detail\nMore.\n').message).toBe(
      'talk.md: line 4: "###" headings are not scenes; start a scene with "##"',
    );
  });

  it('rejects a silent scene without hold at its heading line', () => {
    expect(failure('## A\nHi.\n\n## B\n\n## C\nBye.\n').message).toBe(
      'talk.md: line 4: scene has no narration and no hold',
    );
  });

  it('rejects a scene heading with no title', () => {
    expect(failure('##\nHi.\n').message).toBe('talk.md: line 1: scene has no title');
  });

  it('rejects text before the first scene', () => {
    expect(failure(withFrontmatter('fps: 24').replace('## Scene', 'Intro.\n\n## Scene')).message).toBe(
      'talk.md: line 5: text before the first scene; start every scene with a "##" heading',
    );
  });

  it.each([
    ['a list', '- one\n- two', 'list'],
    ['raw HTML', '<div>hi</div>', 'html'],
    ['a code fence', '```js\nx\n```', 'code'],
  ])('rejects %s inside a scene', (_name, content, type) => {
    expect(failure(`## A\nHi.\n\n${content}\n`).message).toBe(
      `talk.md: line 4: ${type} is not supported in a scene; narration is plain paragraphs`,
    );
  });
});

describe('parse: input shape', () => {
  it.each([
    ['an empty file', ''],
    ['only whitespace', ' \n\n'],
  ])('rejects %s', (_name, markdown) => {
    expect(failure(markdown).message).toBe('talk.md: line 1: script is empty');
  });

  it('rejects a file that has frontmatter and no scenes', () => {
    expect(failure('---\nfps: 24\n---\n').message).toBe(
      'talk.md: line 1: script has no scenes; start one with a "##" heading',
    );
  });

  const lf = '---\ntitle: Demo\nfps: 24\n---\n\n## A\nOne.\n\nTwo.\n\n## B\nThree.\n';

  it('reads Windows line endings like Unix ones', () => {
    expect(parse(lf.replaceAll('\n', '\r\n'), ctx)).toEqual(parse(lf, ctx));
  });

  it('ignores a byte-order mark', () => {
    expect(parse(`\uFEFF${lf}`, ctx)).toEqual(parse(lf, ctx));
  });

  it('keeps line numbers the same with Windows line endings', () => {
    expect(failure('## A\r\nHi.\r\n\r\n## B\r\n').line).toBe(4);
  });
});

describe('parse: heading attributes', () => {
  const sceneWith = (attributes: string) => parse(`## T {${attributes}}\nHi.\n`, ctx).scenes[0];
  const failWith = (attributes: string): string =>
    failure(`## One\nHi.\n\n## T {${attributes}}\nHi.\n`).message;
  const everyName = Object.values(HEADING_NAMES).flat();

  it('reads the USAGE example and strips the attributes from the title', () => {
    const scene = parse(
      '## Scene title {entrance=kinetic emphasis=highlight-sweep transition=slide-left}\nHi.\n',
      ctx,
    ).scenes[0];

    expect(scene).toMatchObject({
      title: 'Scene title',
      entrance: 'kinetic',
      emphasis: 'highlight-sweep',
      transition: 'slide-left',
      bg: 'gradient-drift',
    });
  });

  describe.each(Object.entries(HEADING_NAMES))('%s', (key, names) => {
    it.each(names)('accepts %s', (name) => {
      expect(sceneWith(`${key}=${name}`)).toMatchObject({ [key]: name });
    });

    it('rejects a name from another place and lists the valid ones', () => {
      const foreign = everyName.find((name) => !names.some((valid) => valid === name)) ?? '';

      expect(failWith(`${key}=${foreign}`)).toBe(
        `talk.md: line 4: "${foreign}" is not valid for ${key}; valid: ${names.join(', ')}`,
      );
    });
  });

  it('lists the entrance names in the order USAGE gives them', () => {
    expect(failWith('entrance=typing')).toBe(
      'talk.md: line 4: "typing" is not valid for entrance; valid: typewriter, word-fade, kinetic, letter-drop, scale-pop, slide-up',
    );
  });

  it.each(Object.entries(THEME_DEFAULTS))('keeps %s defaults inside the valid names', (_theme, defaults) => {
    expect(HEADING_NAMES.entrance).toContain(defaults.entrance);
    expect(HEADING_NAMES.transition).toContain(defaults.transition);
    expect(HEADING_NAMES.bg).toContain(defaults.bg);
  });

  it.each([['1'], ['3'], ['1.5'], ['60']])('accepts hold=%s on a silent scene', (hold) => {
    const scene = parse(`## Pause {hold=${hold}}\n`, ctx).scenes[0];

    expect(scene).toMatchObject({ title: 'Pause', narration: '', hold: Number(hold) });
  });

  it.each(['0', '61', 'abc', '-2', '1e2'])('rejects hold=%s', (hold) => {
    expect(failWith(`hold=${hold}`)).toBe(
      `talk.md: line 4: "hold" must be a number from 1 to 60, got "${hold}"`,
    );
  });

  it('rejects an unknown attribute and lists the valid ones', () => {
    expect(failWith('colour=red')).toBe(
      'talk.md: line 4: unknown heading attribute "colour"; valid: entrance, emphasis, transition, bg, hold',
    );
  });

  it('rejects an attribute that is not written key=value', () => {
    expect(failWith('kinetic')).toBe(
      'talk.md: line 4: heading attribute "kinetic" must be written key=value',
    );
  });

  it('rejects an attribute given twice', () => {
    expect(failWith('bg=none bg=particles')).toBe(
      'talk.md: line 4: heading attribute "bg" is given twice',
    );
  });

  it('rejects a heading that is only attributes', () => {
    expect(failure('## {hold=3}\n').message).toBe('talk.md: line 1: scene has no title');
  });

  it('keeps braces that are not at the end of the title', () => {
    expect(parse('## Use {x} well\nHi.\n', ctx).scenes[0]?.title).toBe('Use {x} well');
  });
});

describe('parse: blocks', () => {
  type Kind = keyof typeof BLOCK_ATTRIBUTES;
  const kinds = Object.keys(BLOCK_ATTRIBUTES) as Kind[];

  /** The smallest valid block of each kind. */
  const MINIMAL: Record<Kind, { attrs: string; body: string[] }> = {
    chart: { attrs: 'type=bar', body: ['label,value', 'Q1,12'] },
    code: { attrs: 'lang=python', body: ['x = 1'] },
    list: { attrs: '', body: ['- one'] },
    image: { attrs: 'src=a.png alt="A picture"', body: [] },
    flow: { attrs: '', body: ['A -> B'] },
    path: { attrs: 'src=a.svg', body: [] },
  };

  /** A scene whose block opens on line 4. */
  const inScene = (...lines: string[]): string => ['## A', 'Hi.', '', ...lines, ''].join('\n');
  const fence = (kind: string, attrs: string, body: string[]): string[] => [
    attrs === '' ? `:::${kind}` : `:::${kind}{${attrs}}`,
    ...body,
    ':::',
  ];
  const blocksOf = (...lines: string[]) => parse(inScene(...lines), ctx).scenes[0]?.blocks;
  const problem = (...lines: string[]): string => failure(inScene(...lines)).message;
  /** The minimal block of `kind` with `extra` attributes added, or its body replaced. */
  const withExtra = (kind: Kind, extra: string, body = MINIMAL[kind].body): string[] =>
    fence(kind, `${MINIMAL[kind].attrs} ${extra}`.trim(), body);

  it('reads the USAGE examples of every block', () => {
    const script = [
      '## Blocks',
      'Hi.',
      '',
      ':::chart{type=bar anim=grow-bars}',
      'label,value',
      'Q1,12',
      'Q2,19',
      ':::',
      '',
      ':::code{lang=python anim=line-by-line highlight=2}',
      'def greet(name):',
      '    return f"hello {name}"',
      ':::',
      '',
      ':::list{anim=stagger}',
      '- First point',
      '- Second point',
      ':::',
      '',
      ':::image{src=assets/diagram.png alt="Request flow overview" anim=zoom-focus}',
      ':::',
      '',
      ':::flow{anim=node-by-node}',
      'Browser -> Server -> Database',
      'Server -> Cache',
      ':::',
      '',
      ':::path{src=assets/logo.svg anim=path-draw}',
      ':::',
      '',
    ].join('\n');

    expect(parse(script, ctx).scenes[0]?.blocks).toEqual([
      { kind: 'chart', line: 4, attrs: { type: 'bar', anim: 'grow-bars' }, body: 'label,value\nQ1,12\nQ2,19' },
      {
        kind: 'code',
        line: 10,
        attrs: { lang: 'python', anim: 'line-by-line', highlight: '2' },
        body: 'def greet(name):\n    return f"hello {name}"',
      },
      { kind: 'list', line: 15, attrs: { anim: 'stagger' }, body: 'First point\nSecond point' },
      {
        kind: 'image',
        line: 20,
        attrs: { src: 'assets/diagram.png', alt: 'Request flow overview', anim: 'zoom-focus' },
        body: '',
      },
      {
        kind: 'flow',
        line: 23,
        attrs: { anim: 'node-by-node' },
        body: 'Browser -> Server -> Database\nServer -> Cache',
      },
      { kind: 'path', line: 28, attrs: { src: 'assets/logo.svg', anim: 'path-draw' }, body: '' },
    ]);
  });

  it('keeps narration around blocks in order and out of the blocks', () => {
    const scene = parse(inScene(...fence('flow', '', ['A -> B']), 'After the block.'), ctx).scenes[0];

    expect(scene?.narration).toBe('Hi.\n\nAfter the block.');
    expect(scene?.blocks).toHaveLength(1);
  });

  it('lets a block stand in for narration when the scene has hold', () => {
    const script = ['## Only a picture {hold=3}', ...fence('flow', '', ['A -> B']), ''].join('\n');

    expect(parse(script, ctx).scenes[0]?.blocks).toHaveLength(1);
  });

  it('reads Windows line endings like Unix ones', () => {
    const lf = inScene(...fence('code', 'lang=python', ['a = 1', '', '    b = 2']));

    expect(parse(lf.replaceAll('\n', '\r\n'), ctx)).toEqual(parse(lf, ctx));
  });

  describe.each(kinds)('%s', (kind) => {
    const anims: readonly string[] = BLOCK_ANIMS[kind];

    it('defaults anim to the first valid name', () => {
      expect(blocksOf(...fence(kind, MINIMAL[kind].attrs, MINIMAL[kind].body))?.[0]?.attrs).toMatchObject({
        anim: kind === 'chart' ? 'grow-bars' : anims[0],
      });
    });

    if (kind !== 'chart') {
      it.each(anims)('accepts anim=%s', (anim) => {
        const body = anim === 'diff' ? ['-old', '+new'] : MINIMAL[kind].body;

        expect(blocksOf(...withExtra(kind, `anim=${anim}`, body))?.[0]?.attrs).toMatchObject({ anim });
      });
    }

    it('rejects a name from another place and lists the valid ones', () => {
      const foreign = Object.values(BLOCK_ANIMS).flat().find((name) => !anims.includes(name)) ?? '';

      expect(problem(...withExtra(kind, `anim=${foreign}`))).toBe(
        `talk.md: line 4: "${foreign}" is not valid for ${kind} anim; valid: ${anims.join(', ')}`,
      );
    });

    it('rejects an unknown attribute and lists the valid ones', () => {
      expect(problem(...withExtra(kind, 'colour=red'))).toBe(
        `talk.md: line 4: unknown attribute "colour" on ${kind}; valid: ${Object.keys(BLOCK_ATTRIBUTES[kind]).join(', ')}`,
      );
    });

    it('rejects an attribute given twice', () => {
      expect(problem(...withExtra(kind, 'anim=x anim=y'))).toBe(
        `talk.md: line 4: attribute "anim" is given twice on ${kind}`,
      );
    });

    it('rejects a label', () => {
      expect(problem(`:::${kind}[Label]`, ...MINIMAL[kind].body, ':::')).toBe(
        `talk.md: line 4: ${kind} takes no [label]; write attributes in {...}`,
      );
    });

    const required = Object.entries(BLOCK_ATTRIBUTES[kind])
      .filter(([, isRequired]) => isRequired)
      .map(([name]) => name);

    it.each(required)('requires %s', (name) => {
      const attrs = MINIMAL[kind].attrs.replace(new RegExp(`${name}=("[^"]*"|\\S+)`), '').trim();

      expect(problem(...fence(kind, attrs, MINIMAL[kind].body))).toBe(
        `talk.md: line 4: ${kind} needs the attribute "${name}"`,
      );
    });

    it('rejects a block that is never closed', () => {
      expect(problem(...fence(kind, MINIMAL[kind].attrs, MINIMAL[kind].body).slice(0, -1))).toBe(
        `talk.md: line 4: ${kind} is never closed; end it with ":::"`,
      );
    });
  });

  it('rejects an unknown block and lists the valid ones', () => {
    expect(problem(':::table', ':::')).toBe(
      'talk.md: line 4: unknown block "table"; valid: chart, code, list, image, flow, path',
    );
  });

  it('rejects a block before the first scene', () => {
    expect(failure([...fence('flow', '', ['A -> B']), '', '## A', 'Hi.'].join('\n')).message).toBe(
      'talk.md: line 1: block before the first scene; start every scene with a "##" heading',
    );
  });

  it.each([
    ['a time', 'At 10:30 sharp.'],
    ['a word right after a colon', 'Wait:this is odd.'],
    ['emphasis around one', 'It is *very :cold* here.'],
    ['a directive with a label and attributes', 'See :tip[this]{a=b} now.'],
    ['a url', 'Read https://example.com/a:b today.'],
  ])('keeps colon text as written in narration: %s', (_name, text) => {
    expect(parse(inScene(text), ctx).scenes[0]?.narration).toBe(`Hi.\n\n${text.replaceAll('*', '')}`);
  });

  it('keeps colon text as written in a scene title and a list item', () => {
    const script = ['## Meet at 10:30', 'Hi.', '', ...fence('list', '', ['- Start:now'])].join('\n');
    const scene = parse(script, ctx).scenes[0];

    expect(scene?.title).toBe('Meet at 10:30');
    expect(scene?.blocks[0]?.body).toBe('Start:now');
  });

  it('keeps colon text as written when the file starts with a byte-order mark', () => {
    expect(parse(`\uFEFF## A\nAt 10:30 sharp.\n`, ctx).scenes[0]?.narration).toBe('At 10:30 sharp.');
  });

  it('rejects a line that starts with :: as an unsupported node', () => {
    expect(problem('::note{a=b}')).toBe(
      'talk.md: line 4: leafDirective is not supported in a scene; narration is plain paragraphs',
    );
  });

  describe('chart', () => {
    const chart = (attrs: string, ...body: string[]) => fence('chart', attrs, body);

    it.each(Object.entries(CHART_ANIM))('type=%s animates with %s', (type, anim) => {
      const rows = type === 'bar' || type === 'pie' ? ['Q1,12', 'Q2,19'] : type === 'line' ? ['Q1,1', 'Q2,2'] : ['Done,50'];

      expect(blocksOf(...chart(`type=${type} anim=${anim}`, 'label,value', ...rows))?.[0]?.attrs).toEqual({ type, anim });
    });

    it('rejects an animation that belongs to another chart type', () => {
      expect(problem(...chart('type=bar anim=line-draw', 'label,value', 'Q1,1'))).toBe(
        'talk.md: line 4: bar charts animate with grow-bars, not line-draw',
      );
    });

    it('rejects an unknown type and lists the valid ones', () => {
      expect(problem(...chart('type=donut', 'label,value', 'Q1,1'))).toBe(
        'talk.md: line 4: "donut" is not valid for chart type; valid: bar, line, pie, ring, counter',
      );
    });

    it('keeps the title caption and rejects an empty one', () => {
      expect(blocksOf(...chart('type=bar title="Sales by quarter"', 'label,value', 'Q1,1'))?.[0]?.attrs).toMatchObject({
        title: 'Sales by quarter',
      });
      expect(problem(...chart('type=bar title=""', 'label,value', 'Q1,1'))).toBe(
        'talk.md: line 4: chart "title" must not be empty',
      );
    });

    it('stores the rows with cells trimmed and blank lines dropped', () => {
      expect(blocksOf(...chart('type=bar', ' label , value ', '', 'Q1 , 12', 'Q2,-1.5', ''))?.[0]?.body).toBe(
        'label,value\nQ1,12\nQ2,-1.5',
      );
    });

    it.each([
      ['no body', [], 'line 4: chart needs a CSV body: a header row, then data rows'],
      ['only a header', ['label,value'], 'line 5: chart has a header but no data rows'],
      ['a header with one column', ['label', 'Q1'], 'line 5: the header needs two columns: label,value'],
      ['a row with three cells', ['label,value', 'Q1,1,2'], 'line 6: row 1 needs 2 cells (label,value), got 3'],
      ['a label that is empty', ['label,value', ',3'], 'line 6: row 1 has an empty label'],
      ['a label with a quote', ['label,value', '"Q1",3'], 'line 6: row 1: quotes are not supported in labels'],
      ['a number in words', ['label,value', 'Q1,twelve'], 'line 6: row 1: value "twelve" is not a number'],
      ['an exponent', ['label,value', 'Q1,1e3'], 'line 6: row 1: value "1e3" is not a number'],
      ['a label that is too long', ['label,value', `${'x'.repeat(limits.labelChars + 1)},1`], `line 6: row 1: label is longer than ${String(limits.labelChars)} characters`],
    ])('rejects %s', (_name, body, expected) => {
      expect(problem(...chart('type=bar', ...body))).toBe(`talk.md: ${expected}`);
    });

    it('accepts the row limit and rejects one more', () => {
      const rows = (count: number) => Array.from({ length: count }, (_row, index) => `L${String(index)},1`);

      expect(blocksOf(...chart('type=bar', 'label,value', ...rows(limits.csvRows)))).toHaveLength(1);
      expect(problem(...chart('type=bar', 'label,value', ...rows(limits.csvRows + 1)))).toBe(
        `talk.md: line ${String(5 + limits.csvRows + 1)}: chart has more than ${String(limits.csvRows)} rows`,
      );
    });

    it.each([
      ['a line chart with one point', 'type=line', ['Q1,1'], 'line 4: a line chart needs at least 2 rows, got 1'],
      ['a negative pie value', 'type=pie', ['A,1', 'B,-1'], 'line 7: row 2: pie values must not be negative'],
      ['a pie that adds to zero', 'type=pie', ['A,0', 'B,0'], 'line 4: pie values must add up to more than 0'],
      ['a ring with two rows', 'type=ring', ['A,10', 'B,20'], 'line 4: a ring chart takes one row, got 2'],
      ['a ring above 100', 'type=ring', ['Done,101'], 'line 6: row 1: a ring value must be from 0 to 100, got 101'],
      ['a ring below 0', 'type=ring', ['Done,-1'], 'line 6: row 1: a ring value must be from 0 to 100, got -1'],
      ['a counter with two rows', 'type=counter', ['A,10', 'B,20'], 'line 4: a counter chart takes one row, got 2'],
    ])('rejects %s', (_name, attrs, rows, expected) => {
      expect(problem(...chart(attrs, 'label,value', ...rows))).toBe(`talk.md: ${expected}`);
    });

    it.each([['ring', '0'], ['ring', '100'], ['counter', '-7.25'], ['counter', '1000000']])(
      'accepts %s with value %s',
      (type, value) => {
        expect(blocksOf(...chart(`type=${type}`, 'label,value', `Done,${value}`))).toHaveLength(1);
      },
    );
  });

  describe('code', () => {
    const code = (attrs: string, ...body: string[]) => fence('code', attrs, body);

    it.each(['python', 'py', 'ts', 'bash', 'text'])('accepts lang=%s', (lang) => {
      expect(blocksOf(...code(`lang=${lang}`, 'x'))?.[0]?.attrs).toMatchObject({ lang });
    });

    it('rejects a language shiki does not know', () => {
      expect(problem(...code('lang=klingon', 'x'))).toBe(
        'talk.md: line 4: "klingon" is not a language shiki knows; see https://shiki.style/languages',
      );
    });

    it('keeps the body verbatim, including script-like text, only trimming blank edges', () => {
      const body = ['', '# not a heading', '<script>alert(1)</script>', '$(rm -rf /)', '    indented', '```', ''];

      expect(blocksOf(...code('lang=bash', ...body))?.[0]?.body).toBe(body.slice(1, -1).join('\n'));
    });

    it('does not start a scene from a heading-like line in the body', () => {
      expect(parse(inScene(...code('lang=python', '## Not a scene')), ctx).scenes).toHaveLength(1);
    });

    it.each(['1', '2-3', '1,3', '1-2,3'])('accepts highlight=%s', (highlight) => {
      expect(blocksOf(...code(`lang=python highlight=${highlight}`, 'a', 'b', 'c'))?.[0]?.attrs).toMatchObject({ highlight });
    });

    it.each([
      ['abc', 'highlight must be line numbers or ranges such as 2 or 2-3, got "abc"'],
      ['0', 'highlight must be line numbers or ranges such as 2 or 2-3, got "0"'],
      ['3-2', 'highlight range "3-2" runs backwards'],
    ])('rejects highlight=%s', (highlight, expected) => {
      expect(problem(...code(`lang=python highlight=${highlight}`, 'a', 'b', 'c'))).toBe(
        `talk.md: line 4: ${expected}`,
      );
    });

    it('rejects a highlight beyond the last line', () => {
      expect(problem(...code('lang=python highlight=4', 'a', 'b', 'c'))).toBe(
        'talk.md: line 4: highlight line 4 is beyond the 3 lines of code',
      );
    });

    it('rejects an empty body and one over the line limit', () => {
      expect(problem(...code('lang=python'))).toBe('talk.md: line 4: code has no lines');
      expect(problem(...code('lang=python', ...Array.from({ length: limits.codeLines + 1 }, () => 'x')))).toBe(
        `talk.md: line 4: code has ${String(limits.codeLines + 1)} lines; the limit is ${String(limits.codeLines)}`,
      );
    });

    it('needs a + or - line when the animation is diff', () => {
      expect(blocksOf(...code('lang=python anim=diff', '-old', '+new', 'same'))).toHaveLength(1);
      expect(problem(...code('lang=python anim=diff', 'same', 'also same'))).toBe(
        'talk.md: line 4: anim=diff needs at least one line starting with "+" or "-"',
      );
    });
  });

  describe('list', () => {
    const list = (attrs: string, ...body: string[]) => fence('list', attrs, body);

    it('stores the items as plain text, one per line, for bullets and numbers', () => {
      expect(blocksOf(...list('', '- A **bold** one', '- Second `code`'))?.[0]?.body).toBe('A bold one\nSecond code');
      expect(blocksOf(...list('', '1. First', '2. Second'))?.[0]?.body).toBe('First\nSecond');
    });

    it('accepts the item limit and rejects one more', () => {
      const items = (count: number) => Array.from({ length: count }, (_item, index) => `- Item ${String(index)}`);

      expect(blocksOf(...list('', ...items(limits.listItems)))).toHaveLength(1);
      expect(problem(...list('', ...items(limits.listItems + 1)))).toBe(
        `talk.md: line 4: list has ${String(limits.listItems + 1)} items; the limit is ${String(limits.listItems)}`,
      );
    });

    it.each([
      ['no body', [], 'line 4: list needs a markdown list as its body'],
      ['a paragraph', ['Just text.'], 'line 5: paragraph is not supported in list; the body is one markdown list'],
      ['a nested list', ['- a', '  - b'], 'line 6: nested lists are not supported'],
      ['a code fence in an item', ['- a', '  ```', '  x', '  ```'], 'line 6: code is not supported in a list item'],
      ['a second list', ['- a', '', 'text', '', '- b'], 'line 7: paragraph is not supported in list; the body is one markdown list'],
    ])('rejects %s', (_name, body, expected) => {
      expect(problem(...list('', ...body))).toBe(`talk.md: ${expected}`);
    });
  });

  describe('image and path', () => {
    it('requires alt on an image and keeps it as written', () => {
      expect(problem(':::image{src=a.png}', ':::')).toBe('talk.md: line 4: image needs the attribute "alt"');
      expect(blocksOf(':::image{src=a.png alt="Two words"}', ':::')?.[0]?.attrs).toMatchObject({ alt: 'Two words' });
    });

    it.each(['image', 'path'] as const)('rejects an empty src and any body on %s', (kind) => {
      const attrs = kind === 'image' ? 'src="" alt="A picture"' : 'src=""';

      expect(problem(...fence(kind, attrs, []))).toBe(`talk.md: line 4: ${kind} "src" must not be empty`);
      expect(problem(...withExtra(kind, '', ['text']))).toBe(
        `talk.md: line 4: ${kind} takes no body; put the attributes in {...}`,
      );
    });
  });

  describe('flow', () => {
    const flow = (...body: string[]) => fence('flow', '', body);

    it('stores each chain with single spaces around the arrows', () => {
      expect(blocksOf(...flow('A->B  ->  C', '', 'Web server -> Cache'))?.[0]?.body).toBe('A -> B -> C\nWeb server -> Cache');
    });

    it.each([
      ['no body', [], 'line 4: flow needs chains such as A -> B -> C'],
      ['a line with one node', ['A'], 'line 5: chain "A" needs at least two nodes joined by ->'],
      ['an empty node', ['A -> -> B'], 'line 5: chain "A -> -> B" has an empty node'],
      ['a node that is too long', [`A -> ${'x'.repeat(limits.labelChars + 1)}`], `line 5: node is longer than ${String(limits.labelChars)} characters`],
    ])('rejects %s', (_name, body, expected) => {
      expect(problem(...flow(...body))).toBe(`talk.md: ${expected}`);
    });
  });
});