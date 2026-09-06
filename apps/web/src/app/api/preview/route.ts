import { NextRequest, NextResponse } from 'next/server';
import { validatePreviewUrl } from '@linkiac/shared';

export async function POST(req: NextRequest) {
  try {
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    try {
      const response = await fetch(validation.parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json({ success: false, reason: `HTTP ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return NextResponse.json({ success: false, reason: 'Non-HTML content' });
      }

      // Read max 512KB to avoid memory exhaustion
      const htmlText = await response.text();
      const snippet = htmlText.substring(0, 500000);

      // Extract title
      const titleMatch = snippet.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;

      // Extract Open Graph image
      const ogImageMatch =
        snippet.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        snippet.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        snippet.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
      let thumbnail_url = ogImageMatch ? ogImageMatch[1].trim() : null;

      // Resolve relative image URLs
      if (thumbnail_url && !/^https?:\/\//i.test(thumbnail_url)) {
        try {
          thumbnail_url = new URL(thumbnail_url, validation.parsedUrl.origin).toString();
        } catch {
          thumbnail_url = null;
        }
      }

      return NextResponse.json({
        success: true,
        title,
        thumbnail_url,
      });
    } catch {
      clearTimeout(timeout);
      // Graceful fallback on bot-blocking, timeout, or DNS issue
      return NextResponse.json({ success: false, reason: 'Scrape failed or blocked' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
