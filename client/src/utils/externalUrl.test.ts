import { describe, expect, it } from 'vitest';
import { toSafeExternalUrl } from './externalUrl';

describe('gift links', () => {
  it('normalizes PayBox and BIT web links', () => {
    expect(toSafeExternalUrl(' links.payboxapp.com/bride ')).toBe('https://links.payboxapp.com/bride');
    expect(toSafeExternalUrl('https://links.payboxapp.com/groom')).toBe('https://links.payboxapp.com/groom');
    expect(toSafeExternalUrl('http://example.com/gift')).toBe('http://example.com/gift');
    expect(toSafeExternalUrl('www.example.com')).toBe('https://www.example.com/');
  });

  it('rejects empty, malformed and non-web links', () => {
    for (const value of [undefined, null, '', '   ', 'not a url', 'https://', 'javascript:alert(1)', 'data:text/html,test', 'ftp://example.com']) {
      expect(toSafeExternalUrl(value)).toBeNull();
    }
  });
});