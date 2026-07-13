import { sessionTotalMinutes, withPhaseHeaders } from '../sessions';

describe('sessionTotalMinutes', () => {
  test('sums durations, zero for empty', () => {
    expect(sessionTotalMinutes([])).toBe(0);
    expect(
      sessionTotalMinutes([
        { duration_minutes: 10 },
        { duration_minutes: 15 },
        { duration_minutes: 20 },
      ]),
    ).toBe(45);
  });
});

describe('withPhaseHeaders', () => {
  test('sorts by sort_order and flags the first item of each phase run', () => {
    const items = [
      { phase: 'skills', sort_order: 2 },
      { phase: 'warm-up', sort_order: 0 },
      { phase: 'warm-up', sort_order: 1 },
      { phase: 'game', sort_order: 3 },
    ];
    const result = withPhaseHeaders(items);
    expect(result.map((i) => i.sort_order)).toEqual([0, 1, 2, 3]);
    expect(result.map((i) => i.showPhaseHeader)).toEqual([true, false, true, true]);
  });

  test('null phases never show a header', () => {
    const result = withPhaseHeaders([
      { phase: null, sort_order: 0 },
      { phase: null, sort_order: 1 },
    ]);
    expect(result.every((i) => !i.showPhaseHeader)).toBe(true);
  });
});
