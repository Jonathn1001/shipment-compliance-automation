import { validate } from './env.validation';

describe('validate (environment configuration)', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5433/db?schema=public',
  };

  it('accepts a minimal config and applies defaults', () => {
    const result = validate({ ...base });
    expect(result.DATABASE_URL).toBe(base.DATABASE_URL);
    expect(result.PORT).toBe(3000);
    expect(result.REVIEW_WINDOW_DAYS).toBe(30);
    expect(result.WEIGHT_TOLERANCE_PCT).toBe(5);
  });

  it('coerces numeric strings to numbers', () => {
    const result = validate({
      ...base,
      PORT: '4000',
      WEIGHT_TOLERANCE_PCT: '7',
    });
    expect(result.PORT).toBe(4000);
    expect(result.WEIGHT_TOLERANCE_PCT).toBe(7);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validate({})).toThrow(/DATABASE_URL/);
  });

  it('throws when PORT is out of range', () => {
    expect(() => validate({ ...base, PORT: '70000' })).toThrow(/PORT/);
  });

  it('does not leak the offending value in the error message', () => {
    const secret = 'postgresql://admin:SUPERSECRET@db/prod';
    expect(() => validate({ DATABASE_URL: secret, PORT: '-1' })).toThrow();
    try {
      validate({ DATABASE_URL: secret, PORT: '-1' });
    } catch (err) {
      expect((err as Error).message).not.toContain('SUPERSECRET');
    }
  });
});
