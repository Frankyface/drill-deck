// Mirrors the CHECK constraints in the drills table — single source in the app.
export const SPACE_OPTIONS = [
  '10x10 grid',
  '20x20 grid',
  'channel',
  'quarter pitch',
  'half pitch',
  'full pitch',
  'indoor',
  'any',
] as const;

export const INTENSITY_OPTIONS = ['walk-through', 'moderate', 'high', 'match'] as const;

export const LEVEL_OPTIONS = ['minis', 'juniors', 'seniors', 'all'] as const;
