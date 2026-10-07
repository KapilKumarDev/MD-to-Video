import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parse/index.ts';
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