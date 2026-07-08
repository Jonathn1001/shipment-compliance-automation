import { buildMonthlySeries, tally, windowStart } from './shipment-stats';

describe('shipment-stats helpers', () => {
  const now = new Date('2026-05-15T12:00:00.000Z');

  describe('buildMonthlySeries', () => {
    it('returns `months` buckets, oldest first, ending on the current month', () => {
      const s = buildMonthlySeries([], now, 6);
      expect(s.map((p) => p.month)).toEqual([
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
      ]);
      expect(s.map((p) => p.label)).toEqual([
        'Dec',
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
      ]);
    });

    it('counts timestamps into their month and zero-fills the rest', () => {
      const s = buildMonthlySeries(
        [
          new Date('2026-05-01T00:00:00Z'),
          new Date('2026-05-31T23:59:59Z'),
          new Date('2026-03-10T00:00:00Z'),
        ],
        now,
        6,
      );
      const byMonth = Object.fromEntries(s.map((p) => [p.month, p.count]));
      expect(byMonth['2026-05']).toBe(2);
      expect(byMonth['2026-03']).toBe(1);
      expect(byMonth['2026-01']).toBe(0);
    });

    it('ignores timestamps outside the window', () => {
      const s = buildMonthlySeries([new Date('2025-06-01T00:00:00Z')], now, 6);
      expect(s.reduce((n, p) => n + p.count, 0)).toBe(0);
    });
  });

  describe('windowStart', () => {
    it('is the first day of the earliest month in the window', () => {
      expect(windowStart(now, 6).toISOString()).toBe('2025-12-01T00:00:00.000Z');
    });
  });

  describe('tally', () => {
    it('zero-fills missing keys and overlays observed counts', () => {
      const out = tally(['A', 'B', 'C'] as const, new Map([['B', 4]]));
      expect(out).toEqual({ A: 0, B: 4, C: 0 });
    });
  });
});
