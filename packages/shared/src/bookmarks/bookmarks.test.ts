import { describe, it, expect } from 'vitest';
import { parseNetscapeBookmarks } from './parser';
import { generateNetscapeBookmarks } from './generator';
import { Link, Folder, Category } from '../types';

describe('Netscape Bookmark Parser', () => {
  it('parses typical browser export with folders and items', () => {
    const sampleHtml = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <TITLE>Bookmarks</TITLE>
      <H1>Bookmarks</H1>
      <DL><p>
        <DT><H3 ADD_DATE="1600000000">Tech</H3>
        <DL><p>
          <DT><H3 ADD_DATE="1600000001">Frontend</H3>
          <DL><p>
            <DT><A HREF="https://react.dev" ADD_DATE="1600000002" ICON="data:image/png;base64,aaa">React Documentation</A>
          </DL><p>
          <DT><A HREF="https://nodejs.org" ADD_DATE="1600000003">Node.js</A>
        </DL><p>
        <DT><A HREF="https://news.ycombinator.com" ADD_DATE="1600000004">Hacker News</A>
      </DL><p>
    `;

    const parsed = parseNetscapeBookmarks(sampleHtml);
    expect(parsed.length).toBe(3);

    expect(parsed[0].title).toBe('React Documentation');
    expect(parsed[0].url).toBe('https://react.dev');
    expect(parsed[0].folderPath).toEqual(['Tech', 'Frontend']);
    expect(parsed[0].icon).toBe('data:image/png;base64,aaa');

    expect(parsed[1].title).toBe('Node.js');
    expect(parsed[1].url).toBe('https://nodejs.org');
    expect(parsed[1].folderPath).toEqual(['Tech']);

    expect(parsed[2].title).toBe('Hacker News');
    expect(parsed[2].url).toBe('https://news.ycombinator.com');
    expect(parsed[2].folderPath).toEqual([]);
  });

  it('safely handles malformed and script-injected HTML without executing', () => {
    const maliciousHtml = `
      <DL><p>
        <DT><A HREF="https://safe.org"><script>alert('xss')</script>Safe Link</A>
      </DL><p>
    `;

    const parsed = parseNetscapeBookmarks(maliciousHtml);
    expect(parsed.length).toBe(1);
    expect(parsed[0].url).toBe('https://safe.org');
    expect(parsed[0].title).not.toContain('<script>');
  });
});

describe('Netscape Bookmark Generator', () => {
  it('generates standard HTML matching the Netscape Bookmark specification', () => {
    const categories: Category[] = [
      { id: 'cat-1', user_id: 'u1', name: 'Work', created_at: new Date().toISOString() },
    ];
    const folders: Folder[] = [
      { id: 'fol-1', user_id: 'u1', category_id: null, parent_folder_id: null, name: 'Design', created_at: new Date().toISOString() },
      { id: 'fol-2', user_id: 'u1', category_id: null, parent_folder_id: 'fol-1', name: 'Inspiration', created_at: new Date().toISOString() },
    ];
    const links: Link[] = [
      {
        id: 'lnk-1',
        user_id: 'u1',
        url: 'https://dribbble.com',
        title: 'Dribbble',
        comment: null,
        domain: 'dribbble.com',
        reading_status: 'to_read',
        thumbnail_url: null,
        thumbnail_source: 'none',
        category_id: null,
        folder_id: 'fol-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'lnk-2',
        user_id: 'u1',
        url: 'https://unfiled.com',
        title: 'Unfiled Item',
        comment: null,
        domain: 'unfiled.com',
        reading_status: 'done',
        thumbnail_url: null,
        thumbnail_source: 'none',
        category_id: null,
        folder_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    const html = generateNetscapeBookmarks({ categories, folders, links });
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(html).toContain('<H3 ADD_DATE=');
    expect(html).toContain('Design');
    expect(html).toContain('Inspiration');
    expect(html).toContain('HREF="https://dribbble.com"');
    expect(html).toContain('HREF="https://unfiled.com"');

    // Verify round-trip parse
    const reParsed = parseNetscapeBookmarks(html);
    expect(reParsed.length).toBe(2);
    const dribbble = reParsed.find(b => b.url === 'https://dribbble.com');
    expect(dribbble).toBeDefined();
    expect(dribbble?.folderPath).toEqual(['Design', 'Inspiration']);
  });
});
