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

/** The one list of valid names per heading attribute (USAGE 4.4). `none` switches an effect off. */
export const HEADING_NAMES = {
  entrance: ['typewriter', 'word-fade', 'kinetic', 'letter-drop', 'scale-pop', 'slide-up'],
  emphasis: ['highlight-sweep', 'wave', 'glitch', 'none'],
  transition: ['fade', 'slide-left', 'slide-right', 'wipe', 'flip', 'clock-wipe', 'zoom', 'none'],
  bg: ['gradient-drift', 'particles', 'grid-pulse', 'waveform', 'none'],
} as const;

/** Chart types, each with the one animation that draws it (USAGE 4.3). */
export const CHART_ANIM = {
  bar: 'grow-bars',
  line: 'line-draw',
  pie: 'pie-sweep',
  ring: 'progress-ring',
  counter: 'counter-tick',
} as const;

/** The one list of valid animation names per block kind (USAGE 4.4). The first name is the default. */
export const BLOCK_ANIMS = {
  chart: Object.values(CHART_ANIM),
  code: ['line-by-line', 'diff', 'typing'],
  list: ['stagger', 'card-stack'],
  image: ['parallax', 'zoom-focus', 'flip', 'scale-pop'],
  flow: ['node-by-node'],
  path: ['path-draw'],
} as const;

/** Attributes per block kind, in the order USAGE lists them. `true` means required. */
export const BLOCK_ATTRIBUTES = {
  chart: { type: true, anim: false, title: false },
  code: { lang: true, anim: false, highlight: false },
  list: { anim: false },
  image: { src: true, alt: true, anim: false },
  flow: { anim: false },
  path: { src: true, anim: false },
} as const;

/** Allowed `hold` length in seconds (USAGE 4.2). */
export const HOLD_SECONDS = { min: 1, max: 60 } as const;

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