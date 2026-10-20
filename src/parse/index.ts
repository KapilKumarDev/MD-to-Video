import type { RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { ScriptError } from '../types.ts';
import type { Deck, Scene } from '../types.ts';
import { loadMeta } from './frontmatter.ts';
import { parseHeading } from './heading.ts';
import { DEFAULT_EMPHASIS, THEME_DEFAULTS } from './schema.ts';

const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']);

const lineOf = (node: RootContent): number => node.position?.start.line ?? 1;

export function parse(markdown: string, ctx: { file: string; root: string }): Deck {
  const fail = (line: number, problem: string): never => {
    throw new ScriptError(ctx.file, line, problem);
  };
  if (markdown.trim() === '') fail(1, 'script is empty');

  const children = processor.parse(markdown).children;
  const first = children[0];
  const frontmatter =
    first?.type === 'yaml' ? { yaml: first.value, fenceLine: lineOf(first) } : undefined;
  const meta = loadMeta(frontmatter, ctx.file);
  const defaults = THEME_DEFAULTS[meta.theme];

  const scenes: Scene[] = [];
  const requireLength = (scene: Scene | undefined): void => {
    if (scene?.narration === '' && scene.hold === undefined) {
      fail(scene.line, 'scene has no narration and no hold');
    }
  };

  for (const node of frontmatter ? children.slice(1) : children) {
    const line = lineOf(node);
    const scene = scenes.at(-1);
    if (node.type === 'heading') {
      if (node.depth === 1) {
        fail(line, '"#" headings are not scenes; set the video title with "title" in the frontmatter');
      }
      if (node.depth !== 2) {
        fail(line, `"${'#'.repeat(node.depth)}" headings are not scenes; start a scene with "##"`);
      }
      const { title, attributes } = parseHeading(toString(node).trim(), ctx.file, line);
      if (title === '') fail(line, 'scene has no title');
      requireLength(scene);
      scenes.push({
        index: scenes.length,
        line,
        title,
        narration: '',
        entrance: defaults.entrance,
        emphasis: DEFAULT_EMPHASIS,
        transition: defaults.transition,
        bg: defaults.bg,
        blocks: [],
        ...attributes,
      });
    } else if (node.type !== 'paragraph') {
      fail(line, `${node.type} is not supported in a scene; narration is plain paragraphs`);
    } else if (scene) {
      const paragraph = toString(node).replace(/\s+/g, ' ').trim();
      scene.narration = [scene.narration, paragraph].filter(Boolean).join('\n\n');
    } else {
      fail(line, 'text before the first scene; start every scene with a "##" heading');
    }
  }
  requireLength(scenes.at(-1));
  if (scenes.length === 0) fail(1, 'script has no scenes; start one with a "##" heading');
  return { meta, scenes };
}