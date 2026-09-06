import { describe, it, expect } from 'vitest';
import { validatePreviewUrl, isHostOrIpRestricted } from './ssrf';

describe('SSRF Validator', () => {
  it('allows legitimate public web URLs', () => {
    expect(validatePreviewUrl('https://github.com/trending').safe).toBe(true);
    expect(validatePreviewUrl('http://example.com/article').safe).toBe(true);
    expect(validatePreviewUrl('https://en.wikipedia.org/wiki/Main_Page').safe).toBe(true);
  });

  it('blocks loopback IP addresses', () => {
    expect(validatePreviewUrl('http://127.0.0.1/admin').safe).toBe(false);
    expect(validatePreviewUrl('http://127.0.0.2:8080/').safe).toBe(false);
    expect(validatePreviewUrl('http://localhost:3000/').safe).toBe(false);
    expect(validatePreviewUrl('http://[::1]/').safe).toBe(false);
  });

  it('blocks private RFC 1918 networks', () => {
    expect(validatePreviewUrl('http://10.0.0.1/').safe).toBe(false);
    expect(validatePreviewUrl('http://172.16.5.10/').safe).toBe(false);
    expect(validatePreviewUrl('http://192.168.1.1/router').safe).toBe(false);
  });

  it('blocks AWS/Cloud metadata endpoints (169.254.169.254)', () => {
    expect(validatePreviewUrl('http://169.254.169.254/latest/meta-data/').safe).toBe(false);
    expect(validatePreviewUrl('http://metadata.google.internal/computeMetadata/v1/').safe).toBe(false);
    expect(validatePreviewUrl('http://instance-data/').safe).toBe(false);
  });

  it('blocks disallowed protocols', () => {
    expect(validatePreviewUrl('ftp://ftp.example.com/file').safe).toBe(false);
    expect(validatePreviewUrl('file:///etc/shadow').safe).toBe(false);
    expect(validatePreviewUrl('gopher://gopher.floodgap.com').safe).toBe(false);
  });

  it('blocks internal domain suffixes', () => {
    expect(isHostOrIpRestricted('my-service.local')).toBe(true);
    expect(isHostOrIpRestricted('db.internal')).toBe(true);
    expect(isHostOrIpRestricted('router.lan')).toBe(true);
  });
});
