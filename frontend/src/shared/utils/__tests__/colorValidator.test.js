import { describe, it, expect } from 'vitest';
import { isValidCSSColor } from '../colorValidator';

describe('isValidCSSColor Frontend Utility', () => {
  it('accepts valid HEX colors (3, 4, 6, 8 digits)', () => {
    expect(isValidCSSColor('#D9C7B8')).toBe(true);
    expect(isValidCSSColor('#D9C7B880')).toBe(true);
    expect(isValidCSSColor('#FFF')).toBe(true);
    expect(isValidCSSColor('#FFFF')).toBe(true);
    expect(isValidCSSColor('#123456')).toBe(true);
  });

  it('accepts valid RGB and RGBA color strings including alpha', () => {
    expect(isValidCSSColor('rgb(217, 199, 184)')).toBe(true);
    expect(isValidCSSColor('rgba(217, 199, 184, 0.5)')).toBe(true);
    expect(isValidCSSColor('rgba(0, 0, 0, 1)')).toBe(true);
    expect(isValidCSSColor('rgb(100%, 0%, 50%)')).toBe(true);
  });

  it('accepts CSS named colors including burlywood and transparent', () => {
    expect(isValidCSSColor('burlywood')).toBe(true);
    expect(isValidCSSColor('white')).toBe(true);
    expect(isValidCSSColor('black')).toBe(true);
    expect(isValidCSSColor('transparent')).toBe(true);
  });

  it('rejects invalid color strings, malformed hex, and CSS system keywords', () => {
    expect(isValidCSSColor('not-a-color')).toBe(false);
    expect(isValidCSSColor('#12')).toBe(false);
    expect(isValidCSSColor('#12345')).toBe(false);
    expect(isValidCSSColor('#GGG')).toBe(false);
    expect(isValidCSSColor('rgb(999, 0, 0)')).toBe(false);
    expect(isValidCSSColor('rgb(255)')).toBe(false);
    expect(isValidCSSColor('inherit')).toBe(false);
    expect(isValidCSSColor('initial')).toBe(false);
    expect(isValidCSSColor('')).toBe(false);
    expect(isValidCSSColor(null)).toBe(false);
  });
});
