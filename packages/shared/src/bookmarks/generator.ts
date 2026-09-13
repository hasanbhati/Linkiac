import { Link, Folder } from '../types';
import { isSafeWebUrl, ensureUrlProtocol } from '../utils/url';

export interface ExportData {
  links: Link[];
  folders: Folder[];
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a standard Netscape Bookmark File (.html) from user's links and folders.
 * Supported by Chrome, Firefox, Safari, and Edge.
 */
export function generateNetscapeBookmarks(data: ExportData): string {
  const { links, folders } = data;

  const nowUnix = Math.floor(Date.now() / 1000);

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Linkiac Bookmarks</TITLE>
<H1>Linkiac Bookmarks</H1>
<DL><p>
`;

  // Build folder lookup
  const folderMap = new Map<string, Folder>();
  folders.forEach(f => folderMap.set(f.id, f));

  // Build folder children lookup
  const childFoldersMap = new Map<string | null, Folder[]>();
  folders.forEach(f => {
    const parentId = f.parent_folder_id;
    if (!childFoldersMap.has(parentId)) {
      childFoldersMap.set(parentId, []);
    }
    childFoldersMap.get(parentId)!.push(f);
  });

  // Group links by folder_id
  const linksByFolder = new Map<string | null, Link[]>();
  links.forEach(l => {
    const key = l.folder_id;
    if (!linksByFolder.has(key)) {
      linksByFolder.set(key, []);
    }
    linksByFolder.get(key)!.push(l);
  });

  // Recursive folder renderer
  function renderFolderTree(parentFolderId: string | null, indentLevel: number): string {
    let out = '';
    const childFolders = childFoldersMap.get(parentFolderId) || [];
    const indent = '  '.repeat(indentLevel);

    for (const folder of childFolders) {
      const folderLinks = linksByFolder.get(folder.id) || [];
      const safeFolderName = escapeHtml(folder.name);
      
      out += `${indent}<DT><H3 ADD_DATE="${nowUnix}" LAST_MODIFIED="${nowUnix}">${safeFolderName}</H3>\n`;
      out += `${indent}<DL><p>\n`;

      // Render links in this folder
      for (const link of folderLinks) {
        const title = escapeHtml(link.title || link.url);
        const safeUrl = isSafeWebUrl(link.url) ? ensureUrlProtocol(link.url) : '#';
        const url = escapeHtml(safeUrl);
        const addDate = Math.floor(new Date(link.created_at).getTime() / 1000) || nowUnix;
        out += `${indent}  <DT><A HREF="${url}" ADD_DATE="${addDate}">${title}</A>\n`;
      }

      // Render subfolders recursively
      out += renderFolderTree(folder.id, indentLevel + 1);

      out += `${indent}</DL><p>\n`;
    }

    return out;
  }

  // Render root-level folders (parent_folder_id === null)
  html += renderFolderTree(null, 1);

  // Render standalone unfiled links (no folder)
  const unfiledStandalone = links.filter(l => !l.folder_id);
  if (unfiledStandalone.length > 0) {
    html += `  <DT><H3 ADD_DATE="${nowUnix}">Unfiled</H3>\n`;
    html += `  <DL><p>\n`;
    for (const link of unfiledStandalone) {
      const title = escapeHtml(link.title || link.url);
      const safeUrl = isSafeWebUrl(link.url) ? ensureUrlProtocol(link.url) : '#';
      const url = escapeHtml(safeUrl);
      const addDate = Math.floor(new Date(link.created_at).getTime() / 1000) || nowUnix;
      html += `    <DT><A HREF="${url}" ADD_DATE="${addDate}">${title}</A>\n`;
    }
    html += `  </DL><p>\n`;
  }

  html += `</DL><p>\n`;
  return html;
}
