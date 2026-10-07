import { basename, extname } from 'node:path';
import { isMap, isNode, isScalar, LineCounter, parseDocument } from 'yaml';
import { ScriptError } from '../types.ts';
import type { Meta } from '../types.ts';
import { META_DEFAULTS, META_RULES } from './schema.ts';

/** The YAML block at the top of the script. `fenceLine` is the line of its opening `---`. */
interface Frontmatter {
  yaml: string;
  fenceLine: number;
}

const KEYS = Object.keys(META_RULES);

/** Reads and validates the frontmatter. Keys that are omitted take their defaults. */
export function loadMeta(frontmatter: Frontmatter | undefined, file: string): Meta {
  const given = frontmatter ? readKeys(frontmatter, file) : {};
  return { title: basename(file, extname(file)), ...META_DEFAULTS, ...given };
}

function readKeys({ yaml, fenceLine }: Frontmatter, file: string): Partial<Meta> {
  const lines = new LineCounter();
  const doc = parseDocument(yaml, { lineCounter: lines });
  const offsetOf = (node: unknown): number => (isNode(node) && node.range ? node.range[0] : 0);
  const fail: (offset: number, problem: string) => never = (offset, problem) => {
    throw new ScriptError(file, fenceLine + lines.linePos(offset).line, problem);
  };

  const [broken] = doc.errors;
  if (broken) {
    const problem = broken.message.split('\n')[0] ?? broken.code;
    fail(broken.pos[0], problem.replace(/ at line \d+, column \d+:?$/, ''));
  }
  if (doc.contents === null) return {};
  if (!isMap(doc.contents)) fail(offsetOf(doc.contents), 'frontmatter must be key: value pairs');

  const values = doc.toJS() as Record<string, unknown>;
  const given: Partial<Meta> = {};
  for (const pair of doc.contents.items) {
    const key = isScalar(pair.key) ? String(pair.key.value) : '(complex key)';
    if (!(key in META_RULES)) {
      fail(offsetOf(pair.key), `frontmatter has unknown key "${key}"; valid keys: ${KEYS.join(', ')}`);
    }
    const rule = META_RULES[key as keyof Meta];
    const value = values[key];
    if (!rule.accepts(value)) {
      fail(
        offsetOf(pair.value ?? pair.key),
        `frontmatter "${key}" must be ${rule.expected}, got ${JSON.stringify(value)}`,
      );
    }
    Object.assign(given, { [key]: value });
  }
  return given;
}