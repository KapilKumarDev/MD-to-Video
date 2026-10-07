import type { Fps, Size, Theme } from './parse/schema.ts';

export interface Meta {
  title: string;
  voice: string;
  theme: Theme;
  fps: Fps;
  size: Size;
  music?: string;
  pad: number;
}

interface Block {
  kind: 'chart' | 'code' | 'list' | 'image' | 'flow' | 'path';
  line: number;
  attrs: Record<string, string | number>;
  body: string;
}

export interface Scene {
  index: number;
  line: number;
  title: string;
  narration: string;
  hold?: number;
  entrance: string;
  emphasis: string;
  transition: string;
  bg: string;
  blocks: Block[];
}

export interface Deck {
  meta: Meta;
  scenes: Scene[];
}

/** A problem in the script. The message always names the file and the line. */
export class ScriptError extends Error {
  readonly file: string;
  readonly line: number;

  constructor(file: string, line: number, problem: string) {
    super(`${file}: line ${String(line)}: ${problem}`);
    this.name = 'ScriptError';
    this.file = file;
    this.line = line;
  }
}