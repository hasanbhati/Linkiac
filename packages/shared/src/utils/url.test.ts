import { describe, it, expect } from 'vitest';
import { parseNormalizedDomain, isSafeWebUrl } from './url';

describe('parseNormalizedDomain', () => {
  it('parses standard https url', () => {
    expect(parseNormalizedDomain('https://www.youtube.com/watch?v=123')).toBe('youtube.com');
  });

  it('strips www prefix', () => {
    expect(parseNormalizedDomain('http://www.example.com/blog')).toBe('example.com');
  });

  it('handles url without protocol', () => {
    expect(parseNormalizedDomain('github.com/facebook/react')).toBe('github.com');
  });

  it('handles subdomains and ports', () => {
    expect(parseNormalizedDomain('https://app.dev.linkiac.com:3000/dashboard')).toBe('app.dev.linkiac.com');
  });

  it('returns null for arbitrary non-URL text', () => {
    expect(parseNormalizedDomain('just a random note')).toBe(null);
    expect(parseNormalizedDomain('not a link at all')).toBe(null);
    expect(parseNormalizedDomain('')).toBe(null);
  });
});

describe('isSafeWebUrl', () => {
  it('returns true for safe http and https urls', () => {
    expect(isSafeWebUrl('https://google.com')).toBe(true);
    expect(isSafeWebUrl('http://example.org/page')).toBe(true);
  });

  it('returns false for unsafe protocols or javascript injection', () => {
    expect(isSafeWebUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeWebUrl('data:text/html,<h1>XSS</h1>')).toBe(false);
    expect(isSafeWebUrl('file:///etc/passwd')).toBe(false);
  });

  it('returns false for plain text', () => {
    expect(isSafeWebUrl('some broken link or notes')).toBe(false);
  });
});
