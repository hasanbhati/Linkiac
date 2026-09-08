import { describe, it, expect } from 'vitest';
import { parseNormalizedDomain, isSafeWebUrl, extractDefaultThumbnail } from './url';

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

describe('extractDefaultThumbnail', () => {
  it('extracts youtube video id thumbnail from standard watch url', () => {
    expect(extractDefaultThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('extracts youtube video id thumbnail from youtu.be short url', () => {
    expect(extractDefaultThumbnail('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('extracts youtube shorts thumbnail', () => {
    expect(extractDefaultThumbnail('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('returns direct image urls', () => {
    expect(extractDefaultThumbnail('https://images.unsplash.com/photo-12345')).toBe(
      'https://images.unsplash.com/photo-12345'
    );
    expect(extractDefaultThumbnail('https://example.com/cover.png')).toBe(
      'https://example.com/cover.png'
    );
  });

  it('extracts facebook default thumbnail for facebook urls', () => {
    expect(extractDefaultThumbnail('https://www.facebook.com')).toContain('images.unsplash.com');
    expect(extractDefaultThumbnail('https://facebook.com/share/p/12345')).toContain('images.unsplash.com');
    expect(extractDefaultThumbnail('https://fb.watch/xyz')).toContain('images.unsplash.com');
  });

  it('extracts github repository card', () => {
    expect(extractDefaultThumbnail('https://github.com/facebook/react')).toBe(
      'https://opengraph.githubassets.com/1/facebook/react'
    );
  });

  it('extracts default covers for major platforms', () => {
    expect(extractDefaultThumbnail('https://www.instagram.com/p/abc')).toContain('images.unsplash.com');
    expect(extractDefaultThumbnail('https://twitter.com/jack/status/123')).toContain('images.unsplash.com');
    expect(extractDefaultThumbnail('https://reddit.com/r/webdev')).toContain('images.unsplash.com');
    expect(extractDefaultThumbnail('https://open.spotify.com/track/123')).toContain('images.unsplash.com');
  });

  it('falls back to high-res domain favicon for any valid domain', () => {
    expect(extractDefaultThumbnail('https://example.com/some/article')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=256'
    );
    expect(extractDefaultThumbnail('https://stripe.com')).toBe(
      'https://www.google.com/s2/favicons?domain=stripe.com&sz=256'
    );
  });

  it('returns null for arbitrary non-URL text', () => {
    expect(extractDefaultThumbnail('random note without domain')).toBe(null);
    expect(extractDefaultThumbnail('')).toBe(null);
  });
});

