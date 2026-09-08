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

/**
 * Known high-resolution default cover art for major social and content platforms.
 */
const PLATFORM_DEFAULT_COVERS: Record<string, string> = {
  facebook: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80',
  instagram: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&auto=format&fit=crop&q=80',
  twitter: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=80',
  x: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=80',
  tiktok: 'https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?w=800&auto=format&fit=crop&q=80',
  reddit: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800&auto=format&fit=crop&q=80',
  spotify: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=800&auto=format&fit=crop&q=80',
  linkedin: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=800&auto=format&fit=crop&q=80',
  pinterest: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=800&auto=format&fit=crop&q=80',
  twitch: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&auto=format&fit=crop&q=80',
  discord: 'https://images.unsplash.com/photo-1614680376408-81e91ffe3db7?w=800&auto=format&fit=crop&q=80',
  netflix: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=80',
  wikipedia: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
  github: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&auto=format&fit=crop&q=80',
};

/**
 * Automatically extracts a high-quality default thumbnail URL from known media providers,
 * social platforms (YouTube, Facebook, Instagram, Twitter/X, TikTok, Reddit, GitHub, etc.),
 * or direct image URLs, with a universal domain fallback for any valid website.
 * Returns null if the string is completely empty or cannot be parsed as a domain.
 */
export function extractDefaultThumbnail(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // 1. Direct image URL check (ends with image extension or Unsplash)
  if (
    /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(trimmed) ||
    /images\.unsplash\.com\//i.test(trimmed)
  ) {
    return ensureUrlProtocol(trimmed);
  }

  // 2. YouTube extraction
  const ytMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 3. GitHub repository open-graph card
  const ghRepoMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/i
  );
  if (ghRepoMatch && ghRepoMatch[1] && ghRepoMatch[2] && !['features', 'topics', 'explore', 'settings', 'orgs'].includes(ghRepoMatch[1].toLowerCase())) {
    return `https://opengraph.githubassets.com/1/${ghRepoMatch[1]}/${ghRepoMatch[2]}`;
  }

  // 4. Recognized social/content platforms
  const domain = parseNormalizedDomain(trimmed);
  if (domain) {
    const lowerDomain = domain.toLowerCase();

    if (lowerDomain.includes('facebook.com') || lowerDomain === 'fb.com' || lowerDomain === 'fb.watch') {
      return PLATFORM_DEFAULT_COVERS.facebook;
    }
    if (lowerDomain.includes('instagram.com')) {
      return PLATFORM_DEFAULT_COVERS.instagram;
    }
    if (lowerDomain.includes('twitter.com') || lowerDomain === 'x.com') {
      return PLATFORM_DEFAULT_COVERS.twitter;
    }
    if (lowerDomain.includes('tiktok.com')) {
      return PLATFORM_DEFAULT_COVERS.tiktok;
    }
    if (lowerDomain.includes('reddit.com') || lowerDomain === 'redd.it') {
      return PLATFORM_DEFAULT_COVERS.reddit;
    }
    if (lowerDomain.includes('spotify.com')) {
      return PLATFORM_DEFAULT_COVERS.spotify;
    }
    if (lowerDomain.includes('github.com')) {
      return PLATFORM_DEFAULT_COVERS.github;
    }
    if (lowerDomain.includes('linkedin.com')) {
      return PLATFORM_DEFAULT_COVERS.linkedin;
    }
    if (lowerDomain.includes('pinterest.com') || lowerDomain === 'pin.it') {
      return PLATFORM_DEFAULT_COVERS.pinterest;
    }
    if (lowerDomain.includes('twitch.tv')) {
      return PLATFORM_DEFAULT_COVERS.twitch;
    }
    if (lowerDomain.includes('discord.com') || lowerDomain === 'discord.gg') {
      return PLATFORM_DEFAULT_COVERS.discord;
    }
    if (lowerDomain.includes('netflix.com')) {
      return PLATFORM_DEFAULT_COVERS.netflix;
    }
    if (lowerDomain.includes('wikipedia.org')) {
      return PLATFORM_DEFAULT_COVERS.wikipedia;
    }

    // 5. Universal fallback for any valid domain: high-res Google favicon
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;
  }

  return null;
}

