import { describe, it, expect } from 'vitest';
import { parseTags } from '../../src/registry/types.js';

describe('parseTags', () => {
  it('returns an empty array for an empty string', () => {
    expect(parseTags('')).toEqual([]);
  });

  it('returns an empty array for undefined', () => {
    expect(parseTags(undefined)).toEqual([]);
  });

  it('splits comma-separated tags and trims whitespace', () => {
    expect(parseTags('foo, bar , baz')).toEqual(['foo', 'bar', 'baz']);
  });

  it('drops empty entries from a sparse list', () => {
    expect(parseTags('foo,,bar,')).toEqual(['foo', 'bar']);
  });
});
