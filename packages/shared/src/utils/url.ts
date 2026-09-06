/**
 * Extracts and normalizes a host domain from raw text for dashboard frequency analytics.
 * Returns null if the text cannot be reasonably parsed as an HTTP/HTTPS URL or domain.
 */
export function parseNormalizedDomain(rawText: string): string | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const trimmed = rawText.trim();
  if (!trimmed || trimmed.includes('\n') || trimmed.length > 2048) return null;

  // If text doesn't contain a protocol, prepend https:// if it looks like a domain or path
  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(candidate)) {
    // Check if it has a period or looks like a domain name
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    let host = parsed.hostname.toLowerCase();
    
    // Validate host characters (prevent garbage from passing)
    if (!host || host.includes(' ') || !host.includes('.')) {
      return null;
    }

    // Strip leading www. or www[0-9].
    host = host.replace(/^www\d*\./i, '');

    return host || null;
  } catch {
    return null;
  }
}

/**
 * Checks whether raw text is a safe, clickable web URL.
 * Only HTTP and HTTPS protocols are deemed safe for interactive <a> anchors.
 * Free text, javascript:, file:, data:, or malformed strings return false.
 */
export function isSafeWebUrl(rawText: string): boolean {
  if (!rawText || typeof rawText !== 'string') return false;

  const trimmed = rawText.trim();
  if (!trimmed || trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('file:')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Ensures an external web URL has an explicit protocol for opening in a browser.
 */
export function ensureUrlProtocol(rawText: string): string {
  const trimmed = rawText.trim();
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
