import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROW = /^\|\s*`([^`]+)`\s*\|.*\|\s*(planned|exists)\s*\|[^|]*\|[^|]*\|\s*$/;

export function checkFiles(root: string): string[] {
  const text = readFileSync(join(root, 'docs/FILES.md'), 'utf8');
  const listed = new Map<string, string>();
  for (const line of text.split('\n')) {
    const match = ROW.exec(line);
    if (match) listed.set(match[1] ?? '', match[2] ?? '');
  }

  const problems: string[] = [];
  for (const [path, status] of listed) {
    const present = existsSync(join(root, path));
    if (status === 'exists' && !present) problems.push(`\`${path}\` is listed as exists but is missing`);
    if (status === 'planned' && present) problems.push(`\`${path}\` is listed as planned but already exists`);
  }

  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  });
  const directories = [...listed.keys()].filter((path) => path.endsWith('/'));
  for (const path of tracked.split('\n')) {
    const covered = listed.has(path) || directories.some((directory) => path.startsWith(directory));
    if (path && !covered) problems.push(`\`${path}\` is in the repository but not listed`);
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkFiles(process.cwd());
  for (const problem of problems) console.error(problem);
  process.exitCode = problems.length > 0 ? 1 : 0;
}
