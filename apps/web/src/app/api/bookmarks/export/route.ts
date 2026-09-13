import { NextRequest, NextResponse } from 'next/server';
import { generateNetscapeBookmarks } from '@linkiac/shared';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { links = [], folders = [] } = data;

    const htmlContent = generateNetscapeBookmarks({ links, folders });

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="linkiac_bookmarks.html"',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
