import { NextRequest, NextResponse } from 'next/server';
import { validatePreviewUrl, extractDefaultThumbnail } from '@linkiac/shared';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Require active session to prevent unauthenticated open-proxy abuse
    const authHeader = req.headers.get('authorization');
    const supabase = createClient();
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    let isAuthenticated = false;

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) isAuthenticated = true;
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) isAuthenticated = true;
    }

    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const targetUrl = body.url;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'URL required' }, { status: 400 });
    }

    // SSRF Security Pre-check
    const validation = validatePreviewUrl(targetUrl);
    if (!validation.safe || !validation.parsedUrl) {
      return NextResponse.json(
        { success: false, error: validation.reason || 'Restricted host' },
        { status: 403 }
      );
    }

    const defaultThumbnail = extractDefaultThumbnail(targetUrl);
    const host = validation.parsedUrl.hostname.toLowerCase();

    // Fast-path oEmbed providers (YouTube, Spotify, Reddit, Vimeo, TikTok)
    const oembedConfigs = [
      {
        match: host.includes('youtube.com') || host.includes('youtu.be'),
        endpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`,
      },
      {
        match: host.includes('spotify.com'),
        endpoint: `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`,
      },
      {
        match: host.includes('reddit.com') || host === 'redd.it',
        endpoint: `https://www.reddit.com/oembed?url=${encodeURIComponent(targetUrl)}`,
      },
      {
        match: host.includes('vimeo.com'),
        endpoint: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`,
      },
      {
        match: host.includes('tiktok.com'),
        endpoint: `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`,
      },
    ];

    for (const conf of oembedConfigs) {
      if (conf.match) {
        try {
          const oembedRes = await fetch(conf.endpoint, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(3000),
          });
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            return NextResponse.json({
              success: true,
              title: oembedData.title || null,
              thumbnail_url: oembedData.thumbnail_url || defaultThumbnail,
            });
          }
        } catch {
          // Fall through to HTML scraping
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500); // 4.5 second timeout

    try {
      // Use Facebook / Twitterbot crawler UA so Facebook, Instagram, Twitter, etc. do NOT return HTTP 400/403
      const crawlerUa =
        host.includes('facebook.com') || host === 'fb.com' || host === 'fb.watch'
          ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
          : 'Twitterbot/1.0';

      let currentUrl = validation.parsedUrl.toString();
      let response: Response | null = null;
      let hops = 0;
      const MAX_HOPS = 3;

      while (hops < MAX_HOPS) {
        response = await fetch(currentUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': crawlerUa,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          redirect: 'manual',
        });

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const locationHeader = response.headers.get('location');
          if (!locationHeader) break;

          let nextUrl: string;
          try {
            nextUrl = new URL(locationHeader, currentUrl).toString();
          } catch {
            break;
          }

          // Strict re-validation of redirected destination URL against SSRF
          const redirectValidation = validatePreviewUrl(nextUrl);
          if (!redirectValidation.safe || !redirectValidation.parsedUrl) {
            clearTimeout(timeout);
            return NextResponse.json(
              { success: false, error: 'Redirected host is restricted' },
              { status: 403 }
            );
          }

          currentUrl = nextUrl;
          hops++;
        } else {
          break;
        }
      }

      clearTimeout(timeout);

      if (!response) {
        return NextResponse.json({
          success: true,
          title: null,
          thumbnail_url: defaultThumbnail,
        });
      }

      if (!response.ok) {
        return NextResponse.json({
          success: true,
          title: null,
          thumbnail_url: defaultThumbnail,
        });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return NextResponse.json({
          success: true,
          title: null,
          thumbnail_url: defaultThumbnail,
        });
      }

      // Read max 512KB to avoid memory exhaustion
      const htmlText = await response.text();
      const snippet = htmlText.substring(0, 500000);

      // Extract title
      const titleMatch = snippet.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;

      // Extract Open Graph / Twitter image or high-res icon
      const ogImageMatch =
        snippet.match(/<meta[^>]+property=["']og:image(?::(?:url|secure_url))?["'][^>]+content=["']([^"']+)["']/i) ||
        snippet.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::(?:url|secure_url))?["']/i) ||
        snippet.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
        snippet.match(/<link[^>]+rel=["'](?:image_src|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);

      let thumbnail_url = ogImageMatch ? ogImageMatch[1].trim() : null;

      // Resolve relative image URLs
      if (thumbnail_url && !/^https?:\/\//i.test(thumbnail_url)) {
        try {
          thumbnail_url = new URL(thumbnail_url, response.url || validation.parsedUrl.origin).toString();
        } catch {
          thumbnail_url = null;
        }
      }

      return NextResponse.json({
        success: true,
        title,
        thumbnail_url: thumbnail_url || defaultThumbnail,
      });
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({
        success: true,
        title: null,
        thumbnail_url: defaultThumbnail,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
