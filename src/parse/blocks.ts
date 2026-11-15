import type { ListItem, Nodes, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { bundledLanguages, isSpecialLang } from 'shiki';
import limits from '../../config/limits.json' with { type: 'json' };
import type { Block } from '../types.ts';
import { BLOCK_ANIMS, BLOCK_ATTRIBUTES, CHART_ANIM } from './schema.ts';

export type Fail = (line: number, problem: string) => never;
type Kind = keyof typeof BLOCK_ATTRIBUTES;
type ChartType = keyof typeof CHART_ANIM;
type Directive = Extract<RootContent, { type: 'containerDirective' }>;

/** A block being validated: its place in the file, its attributes and the lines between its fences. */
interface Context {
  kind: Kind;
  node: Directive;
  line: number;
  attrs: Record<string, string>;
  body: readonly string[];
  /** File line of `body[0]`. */
  bodyLine: number;
  fail: Fail;
}

const CLOSING_FENCE = /^\s*:{3,}\s*$/;
const QUOTED = /"[^"]*"|'[^']*'/g;
const GIVEN_KEY = /([^\s=]+)=/g;
const NUMBER = /^-?\d+(\.\d+)?$/;
const HIGHLIGHT = /^[1-9]\d*(-[1-9]\d*)?(,[1-9]\d*(-[1-9]\d*)?)*$/;
const NO_ATTRIBUTE_VALUE = ['title', 'src', 'alt'];

const isKind = (name: string): name is Kind => Object.hasOwn(BLOCK_ATTRIBUTES, name);
const isChartType = (name: string): name is ChartType => Object.hasOwn(CHART_ANIM, name);
const names = (list: readonly string[]): string => list.join(', ');
const cells = (text: string): string[] => text.split(',').map((cell) => cell.trim());

export const lineOf = (node: Nodes): number => node.position?.start.line ?? 1;

/** The non-blank body lines, trimmed, with their file lines. */
const filled = (c: Context): { text: string; line: number }[] =>
  c.body.flatMap((text, index) =>
    text.trim() === '' ? [] : [{ text: text.trim(), line: c.bodyLine + index }],
  );

/**
 * Validates one `:::name{attributes}` block and returns it normalized (see `Block`). `source` is the
 * script split into lines: bodies are read from it verbatim, because markdown would mangle code.
 */
export function parseBlock(node: Directive, source: readonly string[], fail: Fail): Block {
  const line = lineOf(node);
  const kind = node.name;
  if (!isKind(kind)) return fail(line, `unknown block "${kind}"; valid: ${names(Object.keys(BLOCK_ATTRIBUTES))}`);

  const end = node.position?.end.line ?? line;
  if (!CLOSING_FENCE.test(source[end - 1] ?? '')) fail(line, `${kind} is never closed; end it with ":::"`);
  const [label] = node.children;
  if (label?.type === 'paragraph' && label.data?.directiveLabel) fail(line, `${kind} takes no [label]; write attributes in {...}`);

  const seen = new Set<string>();
  const given = /\{(.*)\}\s*$/.exec(source[line - 1] ?? '')?.[1] ?? '';
  for (const [, key = ''] of given.replace(QUOTED, '""').matchAll(GIVEN_KEY)) {
    if (seen.has(key)) fail(line, `attribute "${key}" is given twice on ${kind}`);
    seen.add(key);
  }

  const attrs = readAttributes(node, kind, line, fail);
  const body = BODY[kind]({ kind, node, line, attrs, body: source.slice(line, end - 1), bodyLine: line + 1, fail });
  return { kind, line, attrs, body };
}

/**
 * micromark reads `10:30` as the text directive `:30` and markdown then drops it from the text.
 * Blocks use only `:::`, so every text directive goes back to the characters that were written.
 */
export function restoreInlineText(node: Nodes, text: string): void {
  if (!('children' in node)) return;
  const children: Nodes[] = node.children;
  for (const [index, child] of children.entries()) {
    if (child.type === 'textDirective') {
      const { start, end } = child.position ?? {};
      children[index] = { type: 'text', value: text.slice(start?.offset ?? 0, end?.offset ?? 0) };
    } else {
      restoreInlineText(child, text);
    }
  }
}

/** Checks every attribute against `schema.ts` and fills in the default `anim` where one is implied. */
function readAttributes(node: Directive, kind: Kind, line: number, fail: Fail): Record<string, string> {
  const allowed: Readonly<Record<string, boolean>> = BLOCK_ATTRIBUTES[kind];
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(node.attributes ?? {})) {
    if (!Object.hasOwn(allowed, key)) {
      fail(line, `unknown attribute "${key}" on ${kind}; valid: ${names(Object.keys(allowed))}`);
    }
    attrs[key] = value ?? '';
  }
  for (const [name, required] of Object.entries(allowed)) {
    if (required && attrs[name] === undefined) fail(line, `${kind} needs the attribute "${name}"`);
  }
  for (const name of NO_ATTRIBUTE_VALUE) {
    if (attrs[name] === '') fail(line, `${kind} "${name}" must not be empty`);
  }
  const anims: readonly string[] = BLOCK_ANIMS[kind];
  if (attrs.anim !== undefined && !anims.includes(attrs.anim)) {
    fail(line, `"${attrs.anim}" is not valid for ${kind} anim; valid: ${names(anims)}`);
  }
  if (kind !== 'chart' && attrs.anim === undefined) attrs.anim = BLOCK_ANIMS[kind][0];
  return attrs;
}

function chart(c: Context): string {
  const type = c.attrs.type ?? '';
  if (!isChartType(type)) {
    return c.fail(c.line, `"${type}" is not valid for chart type; valid: ${names(Object.keys(CHART_ANIM))}`);
  }
  const anim = CHART_ANIM[type];
  if (c.attrs.anim !== undefined && c.attrs.anim !== anim) {
    c.fail(c.line, `${type} charts animate with ${anim}, not ${c.attrs.anim}`);
  }
  c.attrs.anim = anim;

  const [header, ...data] = filled(c);
  if (!header) return c.fail(c.line, 'chart needs a CSV body: a header row, then data rows');
  const head = cells(header.text);
  if (head.length !== 2 || head.includes('')) c.fail(header.line, 'the header needs two columns: label,value');
  if (data.length === 0) c.fail(header.line, 'chart has a header but no data rows');
  const overflow = data[limits.csvRows];
  if (overflow) c.fail(overflow.line, `chart has more than ${String(limits.csvRows)} rows`);

  const rows = data.map(({ text, line }, index) => {
    const row = `row ${String(index + 1)}`;
    const cell = cells(text);
    if (cell.length !== 2) c.fail(line, `${row} needs 2 cells (label,value), got ${String(cell.length)}`);
    const [label = '', value = ''] = cell;
    if (label === '') c.fail(line, `${row} has an empty label`);
    if (label.includes('"')) c.fail(line, `${row}: quotes are not supported in labels`);
    if (label.length > limits.labelChars) {
      c.fail(line, `${row}: label is longer than ${String(limits.labelChars)} characters`);
    }
    if (!NUMBER.test(value)) c.fail(line, `${row}: value "${value}" is not a number`);
    return { text: `${label},${value}`, value, amount: Number(value), line, row };
  });

  const count = String(rows.length);
  if ((type === 'ring' || type === 'counter') && rows.length !== 1) {
    c.fail(c.line, `a ${type} chart takes one row, got ${count}`);
  }
  if (type === 'line' && rows.length < 2) c.fail(c.line, `a line chart needs at least 2 rows, got ${count}`);
  for (const { amount, value, line, row } of rows) {
    if (type === 'ring' && (amount < 0 || amount > 100)) {
      c.fail(line, `${row}: a ring value must be from 0 to 100, got ${value}`);
    }
    if (type === 'pie' && amount < 0) c.fail(line, `${row}: pie values must not be negative`);
  }
  if (type === 'pie' && rows.every(({ amount }) => amount === 0)) {
    c.fail(c.line, 'pie values must add up to more than 0');
  }
  return [head.join(','), ...rows.map(({ text }) => text)].join('\n');
}

function code(c: Context): string {
  const lang = c.attrs.lang ?? '';
  if (!Object.hasOwn(bundledLanguages, lang) && !isSpecialLang(lang)) {
    c.fail(c.line, `"${lang}" is not a language shiki knows; see https://shiki.style/languages`);
  }
  const first = c.body.findIndex((text) => text.trim() !== '');
  const lines = first === -1 ? [] : c.body.slice(first, c.body.findLastIndex((text) => text.trim() !== '') + 1);
  if (lines.length === 0) c.fail(c.line, 'code has no lines');
  if (lines.length > limits.codeLines) {
    c.fail(c.line, `code has ${String(lines.length)} lines; the limit is ${String(limits.codeLines)}`);
  }

  const highlight = c.attrs.highlight;
  if (highlight !== undefined) {
    if (!HIGHLIGHT.test(highlight)) {
      c.fail(c.line, `highlight must be line numbers or ranges such as 2 or 2-3, got "${highlight}"`);
    }
    for (const part of highlight.split(',')) {
      const [from = 0, to = from] = part.split('-').map(Number);
      if (from > to) c.fail(c.line, `highlight range "${part}" runs backwards`);
      if (to > lines.length) {
        c.fail(c.line, `highlight line ${String(to)} is beyond the ${String(lines.length)} lines of code`);
      }
    }
  }
  if (c.attrs.anim === 'diff' && !lines.some((text) => /^[+-]/.test(text))) {
    c.fail(c.line, 'anim=diff needs at least one line starting with "+" or "-"');
  }
  return lines.join('\n');
}

function list(c: Context): string {
  const children = c.node.children;
  if (children.length === 0) c.fail(c.line, 'list needs a markdown list as its body');
  for (const [index, child] of children.entries()) {
    if (child.type !== 'list' || index > 0) {
      c.fail(lineOf(child), `${child.type} is not supported in list; the body is one markdown list`);
    }
  }
  const items: ListItem[] = children.flatMap((child) => (child.type === 'list' ? child.children : []));
  if (items.length > limits.listItems) {
    c.fail(c.line, `list has ${String(items.length)} items; the limit is ${String(limits.listItems)}`);
  }
  return items
    .map((item) => {
      const other = item.children.find((child) => child.type !== 'paragraph');
      if (other) {
        c.fail(lineOf(other), other.type === 'list' ? 'nested lists are not supported' : `${other.type} is not supported in a list item`);
      }
      const text = toString(item).replace(/\s+/g, ' ').trim();
      if (text === '') c.fail(lineOf(item), 'list has an empty item');
      return text;
    })
    .join('\n');
}

function flow(c: Context): string {
  const chains = filled(c);
  if (chains.length === 0) c.fail(c.line, 'flow needs chains such as A -> B -> C');
  return chains
    .map(({ text, line }) => {
      const nodes = text.split('->').map((node) => node.trim());
      if (nodes.length < 2) c.fail(line, `chain "${text}" needs at least two nodes joined by ->`);
      if (nodes.includes('')) c.fail(line, `chain "${text}" has an empty node`);
      if (nodes.some((node) => node.length > limits.labelChars)) {
        c.fail(line, `node is longer than ${String(limits.labelChars)} characters`);
      }
      return nodes.join(' -> ');
    })
    .join('\n');
}

/** `image` and `path` read everything from their attributes. */
function noBody(c: Context): string {
  if (filled(c).length > 0) c.fail(c.line, `${c.kind} takes no body; put the attributes in {...}`);
  return '';
}

const BODY: Record<Kind, (c: Context) => string> = { chart, code, list, image: noBody, flow, path: noBody };