import { isValidContainerNumber } from './iso6346.util';

describe('isValidContainerNumber (ISO-6346)', () => {
  it.each(['CSQU3054383', 'MSKU1234565'])(
    'accepts a valid container number %s',
    (n) => {
      expect(isValidContainerNumber(n)).toBe(true);
    },
  );

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(isValidContainerNumber('  csqu3054383 ')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(isValidContainerNumber('CSQU3054384')).toBe(false);
  });

  it('rejects a bad structure (wrong length / letters / category)', () => {
    expect(isValidContainerNumber('CSQ13054383')).toBe(false); // 3rd char not a letter... owner must be 3 letters
    expect(isValidContainerNumber('CSQU305438')).toBe(false); // too short
    expect(isValidContainerNumber('CSQA3054383')).toBe(false); // category must be U/J/Z
    expect(isValidContainerNumber('')).toBe(false);
  });
});
