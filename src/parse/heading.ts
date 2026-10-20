import { ScriptError } from '../types.ts';
import type { Scene } from '../types.ts';
import { HEADING_NAMES, HOLD_SECONDS } from './schema.ts';

type Attributes = Partial<Pick<Scene, keyof typeof HEADING_NAMES | 'hold'>>;

const TRAILING_GROUP = /\s*\{([^{}]*)\}$/;
const PAIR = /^([^=]+)=(.+)$/;
const KEYS = [...Object.keys(HEADING_NAMES), 'hold'].join(', ');

const isPlace = (key: string): key is keyof typeof HEADING_NAMES =>
  Object.hasOwn(HEADING_NAMES, key);

/** Splits a scene heading into its title and the trailing `{key=value ...}` group (USAGE 4.2). */
export function parseHeading(
  text: string,
  file: string,
  line: number,
): { title: string; attributes: Attributes } {
  const fail = (problem: string): never => {
    throw new ScriptError(file, line, problem);
  };
  const group = TRAILING_GROUP.exec(text);
  if (!group) return { title: text, attributes: {} };

  const attributes: Attributes = {};
  const seen = new Set<string>();
  for (const token of (group[1] ?? '').split(/\s+/).filter(Boolean)) {
    const [, key = '', value = ''] =
      PAIR.exec(token) ?? fail(`heading attribute "${token}" must be written key=value`);
    if (seen.has(key)) fail(`heading attribute "${key}" is given twice`);
    seen.add(key);

    if (key === 'hold') {
      const seconds = Number(value);
      if (!/^\d+(\.\d+)?$/.test(value) || seconds < HOLD_SECONDS.min || seconds > HOLD_SECONDS.max) {
        fail(
          `"hold" must be a number from ${String(HOLD_SECONDS.min)} to ${String(HOLD_SECONDS.max)}, got "${value}"`,
        );
      }
      attributes.hold = seconds;
    } else if (isPlace(key)) {
      const names: readonly string[] = HEADING_NAMES[key];
      if (!names.includes(value)) fail(`"${value}" is not valid for ${key}; valid: ${names.join(', ')}`);
      attributes[key] = value;
    } else {
      fail(`unknown heading attribute "${key}"; valid: ${KEYS}`);
    }
  }
  return { title: text.slice(0, group.index).trim(), attributes };
}