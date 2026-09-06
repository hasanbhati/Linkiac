/**
 * SSRF (Server-Side Request Forgery) Prevention Validator
 * Follows OWASP SSRF Prevention Cheat Sheet and Linkiac Engineering Spec.
 */

// Hostnames explicitly blocked as internal or metadata services
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

/**
 * Checks whether an IPv4 string falls within restricted private, loopback, or metadata ranges.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPs are rejected
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata, e.g., 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Shared address space / Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && parts[2] === 255 && parts[3] === 255) return true;

  return false;
}

/**
 * Checks whether an IPv6 string falls within loopback, link-local, or unique-local ranges.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 loopback and :: unspecified
  if (normalized === '::1' || normalized === '::') return true;

  // fe80::/10 (link-local)
  if (normalized.startsWith('fe80:') || /^fe[89ab][0-9a-f]:/i.test(normalized)) return true;

  // fc00::/7 (unique local address)
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;

  // IPv4 mapped IPv6 e.g. ::ffff:127.0.0.1
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped && mapped[1]) {
    return isPrivateOrReservedIPv4(mapped[1]);
  }

  return false;
}

/**
 * Evaluates whether a host or IP string is restricted for outbound thumbnail scraping.
 */
export function isHostOrIpRestricted(host: string): boolean {
  if (!host) return true;

  const normalized = host.toLowerCase().trim();

  if (BLOCKED_HOSTNAMES.has(normalized)) return true;

  // Strip brackets if IPv6
  const cleanHost = normalized.replace(/^\[|\]$/g, '');

  // Check if it's an IPv4 literal
  if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
    return isPrivateOrReservedIPv4(cleanHost);
  }

  // Check if it's an IPv6 literal
  if (cleanHost.includes(':')) {
    return isPrivateOrReservedIPv6(cleanHost);
  }

  // Reject local and internal domain suffixes
  if (
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.lan') ||
    normalized.endsWith('.home') ||
    normalized.endsWith('.corp')
  ) {
    return true;
  }

  return false;
}

export interface SSRFValidationResult {
  safe: boolean;
  reason?: string;
  parsedUrl?: URL;
}

/**
 * Validates a target preview URL against SSRF vulnerabilities before any fetch is attempted.
 */
export function validatePreviewUrl(urlString: string): SSRFValidationResult {
  if (!urlString || typeof urlString !== 'string') {
    return { safe: false, reason: 'URL string is empty or invalid type' };
  }

  const trimmed = urlString.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { safe: false, reason: 'Malformed URL' };
  }

  // Strictly allow only HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  // Check username/password embedded in URL
  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'Credentials in URL are disallowed' };
  }

  // Check hostname
  const host = parsed.hostname;
  if (isHostOrIpRestricted(host)) {
    return { safe: false, reason: `Host is restricted: ${host}` };
  }

  return { safe: true, parsedUrl: parsed };
}
