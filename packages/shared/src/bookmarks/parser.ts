export interface ParsedBookmark {
  url: string;
  title: string;
  folderPath: string[]; // e.g. ['Reading List', 'Tech']
  addDate?: number;
  icon?: string;
}

export interface ParsedFolderNode {
  name: string;
  children: ParsedFolderNode[];
  bookmarks: ParsedBookmark[];
}

/**
 * Safely parses standard Netscape Bookmark HTML into structured bookmark items.
 * Extracts bookmark URLs, titles, timestamps, favicon data, and folder hierarchy.
 * Does NOT execute any JavaScript or construct executable DOM.
 */
export function parseNetscapeBookmarks(htmlContent: string): ParsedBookmark[] {
  const bookmarks: ParsedBookmark[] = [];
  if (!htmlContent || typeof htmlContent !== 'string') return bookmarks;

  // Split into lines or process tokens
  // A regex-based tokenizer is safe from browser DOM execution / XSS
  const folderStack: string[] = [];
  
  // Clean comments
  const sanitized = htmlContent.replace(/<!--[\s\S]*?-->/g, '');

  // Match tags: <H3 ...>...</H3>, <DL>, </DL>, <A HREF="..." ...>...</A>
  const tokenRegex = /(<H3[^>]*>([\s\S]*?)<\/H3>|<DL[\s\S]*?>|<\/DL>|<A\s+[^>]*HREF=["']([^"']*)["'][^>]*>([\s\S]*?)<\/A>)/gi;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(sanitized)) !== null) {
    const fullTag = match[0];

    if (/^<H3/i.test(fullTag)) {
      // Heading introduces a folder name
      const folderName = stripHtml(match[2] || 'Untitled Folder').trim();
      folderStack.push(folderName || 'Untitled Folder');
    } else if (/^<\/DL>/i.test(fullTag)) {
      // Closing a folder level
      if (folderStack.length > 0) {
        folderStack.pop();
      }
    } else if (/^<A\s+/i.test(fullTag)) {
      const url = (match[3] || '').trim();
      const rawTitle = match[4] || '';
      const title = stripHtml(rawTitle).trim() || url;

      // Extract optional ICON attribute
      const iconMatch = fullTag.match(/ICON=["']([^"']+)["']/i);
      const icon = iconMatch ? iconMatch[1] : undefined;

      // Extract optional ADD_DATE attribute
      const dateMatch = fullTag.match(/ADD_DATE=["'](\d+)["']/i);
      const addDate = dateMatch ? parseInt(dateMatch[1], 10) : undefined;

      if (url) {
        bookmarks.push({
          url,
          title,
          folderPath: [...folderStack],
          addDate,
          icon,
        });
      }
    }
  }

  return bookmarks;
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
