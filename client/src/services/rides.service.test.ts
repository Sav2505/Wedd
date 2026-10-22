import { describe, expect, it } from 'vitest';
import { normalizeIsraeliPhone } from './rides.service';

describe('normalizeIsraeliPhone', () => {
  it.each([
    ['054-1234567', '+972541234567'],
    ['0541234567', '+972541234567'],
    ['972548901877', '+972548901877'],
    ['+9720528719088', '+972528719088'],
    ['+972 54-690-1876', '+972546901876'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeIsraeliPhone(input)).toBe(expected);
  });

  it('rejects malformed numbers', () => {
    expect(() => normalizeIsraeliPhone('123')).toThrow('מספר הטלפון אינו תקין');
    expect(() => normalizeIsraeliPhone('+1 212 555 0100')).toThrow('מספר הטלפון אינו תקין');
  });
});