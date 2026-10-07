import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkFiles } from '../../scripts/check-files.ts';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const row = (path: string, status: string) =>
  `| \`${path}\` | module | job | ${status} | - | D1 |`;

const inventory = (...rows: string[]) =>
  [
    '# Files',
    '',
    '## Inventory',
    '',
    '| Path | Module | Job | Status | Last change | Verified by |',
    '|---|---|---|---|---|---|',
    row('docs/FILES.md', 'exists'),
    ...rows,
    '',
    '## Change log',
    '',
  ].join('\n');

function repo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'check-files-'));
  roots.push(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

describe('checkFiles', () => {
  it('reports a path listed as exists that is missing', () => {
    const root = repo({ 'docs/FILES.md': inventory(row('src/a.ts', 'exists')) });

    expect(checkFiles(root)).toEqual(['`src/a.ts` is listed as exists but is missing']);
  });

  it('reports a file that is in the repository but not listed', () => {
    const root = repo({ 'docs/FILES.md': inventory(), 'src/extra.ts': '' });

    expect(checkFiles(root)).toEqual(['`src/extra.ts` is in the repository but not listed']);
  });

  it('reports a path listed as planned that already exists', () => {
    const root = repo({ 'docs/FILES.md': inventory(row('src/a.ts', 'planned')), 'src/a.ts': '' });

    expect(checkFiles(root)).toEqual(['`src/a.ts` is listed as planned but already exists']);
  });

  it('accepts files under a listed directory', () => {
    const root = repo({
      'docs/FILES.md': inventory(row('tests/fixtures/hostile/', 'exists')),
      'tests/fixtures/hostile/alias-bomb.md': '',
    });

    expect(checkFiles(root)).toEqual([]);
  });

  it('reads an inventory written with Windows line endings', () => {
    const root = repo({
      'docs/FILES.md': inventory(row('src/a.ts', 'exists')).replaceAll('\n', '\r\n'),
    });

    expect(checkFiles(root)).toEqual(['`src/a.ts` is listed as exists but is missing']);
  });
});
