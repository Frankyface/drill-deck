// Single high-contrast light theme — coaches use this outdoors in daylight.
export const colors = {
  bg: '#f6f8f6',
  card: '#ffffff',
  border: '#d9e2d9',
  text: '#14261a',
  textMuted: '#5b6f61',
  primary: '#166534', // pitch green
  primaryPressed: '#14532d',
  onPrimary: '#ffffff',
  accent: '#65a30d',
  danger: '#b91c1c',
  warning: '#b45309',
  chipBg: '#e8f0e8',
  chipSelectedBg: '#166534',
  chipSelectedText: '#ffffff',
  star: '#f59e0b',
  attack: '#dc2626', // diagram token colors
  defence: '#2563eb',
  neutral: '#475569',
  cone: '#f97316',
  ball: '#78350f',
  pitchGrass: '#2f855a',
  pitchLine: '#ffffff',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const font = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  title: 32,
} as const;

/** Minimum touch target for gloved/cold fingers pitch-side. */
export const MIN_TOUCH = 44;
