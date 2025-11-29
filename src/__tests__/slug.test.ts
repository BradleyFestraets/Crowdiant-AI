import { describe, it, expect } from 'vitest';
import { generateBaseSlug } from '../lib/slug';

describe('generateBaseSlug', () => {
  it('sanitizes and lowercases name', () => {
    expect(generateBaseSlug('My Venue!!')).toBe('my-venue');
  });
  it('collapses whitespace and hyphens', () => {
    expect(generateBaseSlug('A   B -- C')).toBe('a-b-c');
  });
  it('truncates to maxLength', () => {
    const long = 'a'.repeat(60);
    expect(generateBaseSlug(long, 10)).toBe('aaaaaaaaaa');
  });
});
