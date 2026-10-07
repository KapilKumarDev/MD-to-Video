import type { Meta } from '../types.ts';

const THEMES = ['midnight', 'daylight', 'high-contrast'] as const;
const FPS_VALUES = [24, 30, 60] as const;
const SIZES = ['1080p', '720p', 'square', 'vertical'] as const;

export type Theme = (typeof THEMES)[number];
export type Fps = (typeof FPS_VALUES)[number];
export type Size = (typeof SIZES)[number];

/** Frontmatter values used when a key is omitted (USAGE 4.1). `title` defaults to the file name. */
export const META_DEFAULTS = {
  voice: 'en_US-lessac-medium',
  theme: 'midnight',
  fps: 30,
  size: '1080p',
  pad: 0.6,
} as const satisfies Omit<Meta, 'title' | 'music'>;

export const DEFAULT_EMPHASIS = 'none';

/** What "theme default" means for a scene heading (USAGE 4.1). */
export const THEME_DEFAULTS = {
  midnight: { entrance: 'kinetic', transition: 'fade', bg: 'gradient-drift' },
  daylight: { entrance: 'slide-up', transition: 'slide-left', bg: 'none' },
  'high-contrast': { entrance: 'word-fade', transition: 'fade', bg: 'none' },
} as const satisfies Record<Theme, { entrance: string; transition: string; bg: string }>;

interface Rule {
  expected: string;
  accepts: (value: unknown) => boolean;
}

const text = (expected: string, pattern = /\S/): Rule => ({
  expected,
  accepts: (value) => typeof value === 'string' && pattern.test(value),
});

const oneOf = (values: readonly (string | number)[]): Rule => ({
  expected: `one of ${values.join(', ')}`,
  accepts: (value) => values.some((allowed) => allowed === value),
});

const PAD_MAX = 3;

/** One rule per frontmatter key, in the order USAGE 4.1 lists them. */
export const META_RULES = {
  title: text('text'),
  voice: text(`a voice id such as ${META_DEFAULTS.voice}`, /^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  theme: oneOf(THEMES),
  fps: oneOf(FPS_VALUES),
  size: oneOf(SIZES),
  music: text('a file path'),
  pad: {
    expected: `a number from 0 to ${String(PAD_MAX)}`,
    accepts: (value) => typeof value === 'number' && value >= 0 && value <= PAD_MAX,
  },
} as const satisfies Record<keyof Meta, Rule>;