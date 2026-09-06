'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Profile,
  Category,
  Folder,
  Link,
  Tag,
  Friendship,
  SendRecipient,
  DomainStat,
  ReadingStatus,
  parseNormalizedDomain,
  ParsedBookmark,
} from '@linkiac/shared';
import { defaultCurrentUser } from './constants';
import { getSupabase } from './supabase/client';

interface AppContextType {
  currentUser: Profile;
  links: Link[];
  categories: Category[];
  folders: Folder[];
  tags: Tag[];
  friends: Friendship[];
  suggestions: SendRecipient[];
  domainStats: DomainStat[];
  isLoaded: boolean;
  // Actions
  addLink: (link: {
    url: string;
    title?: string | null;
    comment?: string | null;
    reading_status?: ReadingStatus;
    category_id?: string | null;
    folder_id?: string | null;
    tags?: string[];
    thumbnail_url?: string | null;
  }) => Promise<Link>;
  updateLink: (id: string, updates: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  addCategory: (name: string) => Category;
  deleteCategory: (id: string) => Promise<void>;
  addFolder: (name: string, category_id?: string | null, parent_folder_id?: string | null) => Folder;
  moveFolder: (folder_id: string, new_parent_folder_id: string | null, new_category_id?: string | null) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<void>;
  bulkMoveLinks: (link_ids: string[], category_id: string | null, folder_id: string | null) => Promise<void>;
  bulkTagLinks: (link_ids: string[], tag_names: string[]) => Promise<void>;
  bulkDeleteLinks: (link_ids: string[]) => Promise<void>;
  sendLinkToFriends: (data: {
    url: string;
    comment?: string | null;
    recipient_ids: string[];
    source_link_id?: string | null;
    thumbnail_url?: string | null;
  }) => Promise<void>;
  acceptSuggestion: (
    suggestion_id: string,
    category_id: string | null,
    folder_id: string | null,
    customComment?: string | null
  ) => Promise<void>;
  rejectSuggestion: (suggestion_id: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  importBookmarks: (items: ParsedBookmark[]) => Promise<{ importedCount: number; foldersCount: number }>;
  resetToSeed: () => Promise<void>;
  syncAllFromSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'linkiac_local_cache_v2';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile>(defaultCurrentUser);
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<SendRecipient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronize all domain entities from Supabase
  const syncAllFromSupabase = useCallback(async () => {
    try {
      const supabase = getSupabase();

      // Check current auth session
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (authUser && isValidUUID(authUser.id)) {
        setCurrentUser(prev => ({
          ...prev,
          id: authUser.id,
          username: authUser.user_metadata?.username || prev.username,
          display_name: authUser.user_metadata?.display_name || prev.display_name,
        }));
      }

      const [linksRes, catsRes, foldersRes, friendsRes, suggestionsRes, tagsRes] = await Promise.allSettled([
        supabase
          .from('links')
          .select('*, link_tags(tag:tags(*))')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('folders').select('*').order('name', { ascending: true }),
        supabase
          .from('friendships')
          .select('*, requester:profiles!friendships_requester_id_fkey(*), recipient:profiles!friendships_recipient_id_fkey(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('send_recipients')
          .select('*, send:sends(*, sender:profiles!sends_sender_id_fkey(*))')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase.from('tags').select('*').order('name', { ascending: true }),
      ]);

      if (linksRes.status === 'fulfilled' && !linksRes.value.error && Array.isArray(linksRes.value.data)) {
        const transformed: Link[] = linksRes.value.data.map((l: any) => ({
          id: l.id,
          user_id: l.user_id || defaultCurrentUser.id,
          url: l.url,
          title: l.title || null,
          comment: l.comment || null,
          domain: l.domain || parseNormalizedDomain(l.url),
          reading_status: l.reading_status || 'to_read',
          thumbnail_url: l.thumbnail_url || null,
          thumbnail_source: l.thumbnail_source || (l.thumbnail_url ? 'auto' : 'none'),
          category_id: l.category_id || null,
          folder_id: l.folder_id || null,
          tags: l.link_tags?.map((lt: any) => lt.tag).filter(Boolean) || [],
          created_at: l.created_at,
          updated_at: l.updated_at || l.created_at,
        }));
        setLinks(transformed);
      }

      if (catsRes.status === 'fulfilled' && !catsRes.value.error && Array.isArray(catsRes.value.data)) {
        setCategories(catsRes.value.data);
      }

      if (foldersRes.status === 'fulfilled' && !foldersRes.value.error && Array.isArray(foldersRes.value.data)) {
        setFolders(foldersRes.value.data);
      }

      if (friendsRes.status === 'fulfilled' && !friendsRes.value.error && Array.isArray(friendsRes.value.data)) {
        setFriends(friendsRes.value.data);
      }

      if (suggestionsRes.status === 'fulfilled' && !suggestionsRes.value.error && Array.isArray(suggestionsRes.value.data)) {
        setSuggestions(suggestionsRes.value.data);
      }

      if (tagsRes.status === 'fulfilled' && !tagsRes.value.error && Array.isArray(tagsRes.value.data)) {
        setTags(tagsRes.value.data);
      }
    } catch (err) {
      console.warn('Linkiac web sync notice:', err);
    }
  }, []);

  // Initialize from local cache and trigger initial sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.links)) setLinks(parsed.links);
        if (Array.isArray(parsed.categories)) setCategories(parsed.categories);
        if (Array.isArray(parsed.folders)) setFolders(parsed.folders);
        if (Array.isArray(parsed.tags)) setTags(parsed.tags);
        if (Array.isArray(parsed.friends)) setFriends(parsed.friends);
        if (Array.isArray(parsed.suggestions)) setSuggestions(parsed.suggestions);
      }
    } catch {
      // Local storage unavailable or corrupt
    }
    setIsLoaded(true);

    // Initial background sync
    syncAllFromSupabase();

    // Polling sync every 4 seconds for cross-device consistency
    const pollInterval = setInterval(() => {
      syncAllFromSupabase();
    }, 4000);

    // Window focus & visibility change sync
    const handleFocus = () => syncAllFromSupabase();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncAllFromSupabase]);

  // Persist to localStorage cache
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          links,
          categories,
          folders,
          tags,
          friends,
          suggestions,
        })
      );
    } catch {
      // Quota exceeded
    }
  }, [links, categories, folders, tags, friends, suggestions, isLoaded]);

  // Dynamic domain statistics
  const domainStats: DomainStat[] = useMemo(() => {
    const counts = new Map<string, number>();
    links.forEach(link => {
      if (link.domain) {
        counts.set(link.domain, (counts.get(link.domain) || 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
  }, [links]);

  // Actions
  const addLink = async (data: {
    url: string;
    title?: string | null;
    comment?: string | null;
    reading_status?: ReadingStatus;
    category_id?: string | null;
    folder_id?: string | null;
    tags?: string[];
    thumbnail_url?: string | null;
  }): Promise<Link> => {
    const domain = parseNormalizedDomain(data.url);
    const now = new Date().toISOString();
    const newId = generateUUID();

    const linkTags: Tag[] = (data.tags || []).map(name => {
      const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      return {
        id: generateUUID(),
        user_id: currentUser.id,
        name: name.trim(),
        created_at: now,
      };
    });

    const newLink: Link = {
      id: newId,
      user_id: currentUser.id,
      url: data.url,
      title: data.title || null,
      comment: data.comment || null,
      domain,
      reading_status: data.reading_status || 'to_read',
      thumbnail_url: data.thumbnail_url || null,
      thumbnail_source: data.thumbnail_url ? 'auto' : 'none',
      category_id: data.category_id || null,
      folder_id: data.folder_id || null,
      tags: linkTags,
      created_at: now,
      updated_at: now,
    };

    // Optimistic local state update
    setLinks(prev => [newLink, ...prev]);

    // Push to Supabase
    try {
      const supabase = getSupabase();
      await supabase.from('links').insert({
        id: newId,
        user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        url: data.url,
        title: data.title || null,
        comment: data.comment || null,
        domain,
        reading_status: data.reading_status || 'to_read',
        thumbnail_url: data.thumbnail_url || null,
        thumbnail_source: data.thumbnail_url ? 'auto' : 'none',
        category_id: data.category_id && isValidUUID(data.category_id) ? data.category_id : null,
        folder_id: data.folder_id && isValidUUID(data.folder_id) ? data.folder_id : null,
      });

      // Handle tags
      for (const tag of linkTags) {
        if (isValidUUID(tag.id)) {
          await supabase.from('tags').upsert({
            id: tag.id,
            user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
            name: tag.name,
          });
          await supabase.from('link_tags').upsert({
            link_id: newId,
            tag_id: tag.id,
          });
        }
      }
    } catch (e) {
      console.warn('Supabase addLink notice:', e);
    }

    syncAllFromSupabase();
    return newLink;
  };

  const updateLink = async (id: string, updates: Partial<Link>): Promise<void> => {
    setLinks(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        const updatedUrl = updates.url !== undefined ? updates.url : l.url;
        const domain = updates.url !== undefined ? parseNormalizedDomain(updatedUrl) : l.domain;
        return {
          ...l,
          ...updates,
          domain,
          updated_at: new Date().toISOString(),
        };
      })
    );

    if (isValidUUID(id)) {
      try {
        const supabase = getSupabase();
        const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
        delete dbUpdates.tags;
        delete dbUpdates.link_tags;
        if (dbUpdates.category_id && !isValidUUID(dbUpdates.category_id)) dbUpdates.category_id = null;
        if (dbUpdates.folder_id && !isValidUUID(dbUpdates.folder_id)) dbUpdates.folder_id = null;
        await supabase.from('links').update(dbUpdates).eq('id', id);
      } catch (e) {
        console.warn('Supabase updateLink notice:', e);
      }
    }

    syncAllFromSupabase();
  };

  const deleteLink = async (id: string): Promise<void> => {
    setLinks(prev => prev.filter(l => l.id !== id));

    if (isValidUUID(id)) {
      try {
        const supabase = getSupabase();
        await supabase.from('link_tags').delete().eq('link_id', id);
        await supabase.from('links').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteLink notice:', e);
      }
    }

    syncAllFromSupabase();
  };

  const addCategory = (name: string): Category => {
    const catId = generateUUID();
    const newCategory: Category = {
      id: catId,
      user_id: currentUser.id,
      name: name.trim(),
      created_at: new Date().toISOString(),
    };

    setCategories(prev => [...prev, newCategory]);

    try {
      const supabase = getSupabase();
      supabase
        .from('categories')
        .insert({
          id: catId,
          user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
          name: name.trim(),
        })
        .then(() => syncAllFromSupabase());
    } catch (e) {
      console.warn('Supabase addCategory notice:', e);
    }

    return newCategory;
  };

  const deleteCategory = async (id: string): Promise<void> => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setFolders(prev => prev.map(f => (f.category_id === id ? { ...f, category_id: null } : f)));
    setLinks(prev => prev.map(l => (l.category_id === id ? { ...l, category_id: null } : l)));

    if (isValidUUID(id)) {
      try {
        const supabase = getSupabase();
        await supabase.from('links').update({ category_id: null }).eq('category_id', id);
        await supabase.from('folders').update({ category_id: null }).eq('category_id', id);
        await supabase.from('categories').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteCategory notice:', e);
      }
    }

    syncAllFromSupabase();
  };

  const addFolder = (name: string, category_id?: string | null, parent_folder_id?: string | null): Folder => {
    let resolvedCategoryId = category_id || null;
    if (parent_folder_id) {
      const parent = folders.find(f => f.id === parent_folder_id);
      if (parent) resolvedCategoryId = parent.category_id;
    }

    const folderId = generateUUID();
    const newFolder: Folder = {
      id: folderId,
      user_id: currentUser.id,
      category_id: resolvedCategoryId,
      parent_folder_id: parent_folder_id || null,
      name: name.trim(),
      created_at: new Date().toISOString(),
    };

    setFolders(prev => [...prev, newFolder]);

    try {
      const supabase = getSupabase();
      supabase
        .from('folders')
        .insert({
          id: folderId,
          user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
          category_id: resolvedCategoryId && isValidUUID(resolvedCategoryId) ? resolvedCategoryId : null,
          parent_folder_id: parent_folder_id && isValidUUID(parent_folder_id) ? parent_folder_id : null,
          name: name.trim(),
        })
        .then(() => syncAllFromSupabase());
    } catch (e) {
      console.warn('Supabase addFolder notice:', e);
    }

    return newFolder;
  };

  const moveFolder = async (
    folder_id: string,
    new_parent_folder_id: string | null,
    new_category_id?: string | null
  ): Promise<boolean> => {
    if (folder_id === new_parent_folder_id) return false;

    const isDescendant = (checkId: string | null, targetAncestorId: string): boolean => {
      if (!checkId) return false;
      if (checkId === targetAncestorId) return true;
      const current = folders.find(f => f.id === checkId);
      return current?.parent_folder_id ? isDescendant(current.parent_folder_id, targetAncestorId) : false;
    };

    if (new_parent_folder_id && isDescendant(new_parent_folder_id, folder_id)) {
      return false;
    }

    let categoryContext = new_category_id !== undefined ? new_category_id : null;
    if (new_parent_folder_id) {
      const parent = folders.find(f => f.id === new_parent_folder_id);
      if (parent) categoryContext = parent.category_id;
    }

    setFolders(prev =>
      prev.map(f => {
        if (f.id === folder_id) {
          return {
            ...f,
            parent_folder_id: new_parent_folder_id,
            category_id: categoryContext,
          };
        }
        return f;
      })
    );

    if (isValidUUID(folder_id)) {
      try {
        const supabase = getSupabase();
        await supabase
          .from('folders')
          .update({
            parent_folder_id: new_parent_folder_id && isValidUUID(new_parent_folder_id) ? new_parent_folder_id : null,
            category_id: categoryContext && isValidUUID(categoryContext) ? categoryContext : null,
          })
          .eq('id', folder_id);
      } catch (e) {
        console.warn('Supabase moveFolder notice:', e);
      }
    }

    syncAllFromSupabase();
    return true;
  };

  const deleteFolder = async (id: string): Promise<void> => {
    const getDescendantIds = (folderId: string): string[] => {
      const children = folders.filter(f => f.parent_folder_id === folderId);
      return [folderId, ...children.flatMap(c => getDescendantIds(c.id))];
    };

    const idsToDelete = new Set(getDescendantIds(id));
    setFolders(prev => prev.filter(f => !idsToDelete.has(f.id)));
    setLinks(prev => prev.map(l => (l.folder_id && idsToDelete.has(l.folder_id) ? { ...l, folder_id: null } : l)));

    try {
      const supabase = getSupabase();
      for (const fId of Array.from(idsToDelete)) {
        if (isValidUUID(fId)) {
          await supabase.from('links').update({ folder_id: null }).eq('folder_id', fId);
          await supabase.from('folders').delete().eq('id', fId);
        }
      }
    } catch (e) {
      console.warn('Supabase deleteFolder notice:', e);
    }

    syncAllFromSupabase();
  };

  const bulkMoveLinks = async (link_ids: string[], category_id: string | null, folder_id: string | null) => {
    const idSet = new Set(link_ids);
    setLinks(prev =>
      prev.map(l => (idSet.has(l.id) ? { ...l, category_id, folder_id, updated_at: new Date().toISOString() } : l))
    );

    try {
      const supabase = getSupabase();
      const validLinkIds = link_ids.filter(isValidUUID);
      if (validLinkIds.length > 0) {
        await supabase
          .from('links')
          .update({
            category_id: category_id && isValidUUID(category_id) ? category_id : null,
            folder_id: folder_id && isValidUUID(folder_id) ? folder_id : null,
            updated_at: new Date().toISOString(),
          })
          .in('id', validLinkIds);
      }
    } catch (e) {
      console.warn('Supabase bulkMoveLinks notice:', e);
    }

    syncAllFromSupabase();
  };

  const bulkTagLinks = async (link_ids: string[], tag_names: string[]) => {
    const idSet = new Set(link_ids);
    const now = new Date().toISOString();

    const createdTags: Tag[] = tag_names.map(name => {
      const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      return {
        id: generateUUID(),
        user_id: currentUser.id,
        name: name.trim(),
        created_at: now,
      };
    });

    setLinks(prev =>
      prev.map(l => {
        if (!idSet.has(l.id)) return l;
        const currentTagNames = new Set((l.tags || []).map(t => t.name.toLowerCase()));
        const toAdd = createdTags.filter(t => !currentTagNames.has(t.name.toLowerCase()));
        return {
          ...l,
          tags: [...(l.tags || []), ...toAdd],
          updated_at: now,
        };
      })
    );

    try {
      const supabase = getSupabase();
      for (const t of createdTags) {
        if (isValidUUID(t.id)) {
          await supabase.from('tags').upsert({
            id: t.id,
            user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
            name: t.name,
          });
          for (const linkId of link_ids) {
            if (isValidUUID(linkId)) {
              await supabase.from('link_tags').upsert({
                link_id: linkId,
                tag_id: t.id,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Supabase bulkTagLinks notice:', e);
    }

    syncAllFromSupabase();
  };

  const bulkDeleteLinks = async (link_ids: string[]) => {
    const idSet = new Set(link_ids);
    setLinks(prev => prev.filter(l => !idSet.has(l.id)));

    try {
      const supabase = getSupabase();
      const validLinkIds = link_ids.filter(isValidUUID);
      if (validLinkIds.length > 0) {
        await supabase.from('link_tags').delete().in('link_id', validLinkIds);
        await supabase.from('links').delete().in('id', validLinkIds);
      }
    } catch (e) {
      console.warn('Supabase bulkDeleteLinks notice:', e);
    }

    syncAllFromSupabase();
  };

  const sendLinkToFriends = async (data: {
    url: string;
    comment?: string | null;
    recipient_ids: string[];
    source_link_id?: string | null;
    thumbnail_url?: string | null;
  }) => {
    const sendId = generateUUID();
    const now = new Date().toISOString();

    const newSuggestions: SendRecipient[] = data.recipient_ids.map(recipientId => ({
      id: generateUUID(),
      send_id: sendId,
      recipient_id: recipientId,
      status: 'pending',
      reading_status: 'to_read',
      resulting_link_id: null,
      created_at: now,
      decided_at: null,
      send: {
        id: sendId,
        sender_id: currentUser.id,
        url: data.url,
        comment: data.comment || null,
        thumbnail_url: data.thumbnail_url || null,
        source_link_id: data.source_link_id || null,
        created_at: now,
        sender: currentUser,
      },
    }));

    setSuggestions(prev => [...newSuggestions, ...prev]);

    try {
      const supabase = getSupabase();
      await supabase.from('sends').insert({
        id: sendId,
        sender_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        url: data.url,
        comment: data.comment || null,
        thumbnail_url: data.thumbnail_url || null,
        source_link_id: data.source_link_id && isValidUUID(data.source_link_id) ? data.source_link_id : null,
      });

      for (const rec of newSuggestions) {
        await supabase.from('send_recipients').insert({
          id: rec.id,
          send_id: sendId,
          recipient_id: rec.recipient_id,
          status: 'pending',
          reading_status: 'to_read',
        });
      }
    } catch (e) {
      console.warn('Supabase sendLinkToFriends notice:', e);
    }

    syncAllFromSupabase();
  };

  const acceptSuggestion = async (
    suggestion_id: string,
    category_id: string | null,
    folder_id: string | null,
    customComment?: string | null
  ) => {
    const item = suggestions.find(s => s.id === suggestion_id);
    if (!item || !item.send) return;

    const newLinkId = generateUUID();
    const now = new Date().toISOString();

    const createdLink: Link = {
      id: newLinkId,
      user_id: currentUser.id,
      url: item.send.url,
      title: item.send.sender ? `Shared by @${item.send.sender.username}` : 'Suggested link',
      comment: customComment !== undefined ? customComment : item.send.comment,
      domain: parseNormalizedDomain(item.send.url),
      reading_status: item.reading_status,
      thumbnail_url: item.send.thumbnail_url,
      thumbnail_source: item.send.thumbnail_url ? 'auto' : 'none',
      category_id: category_id || null,
      folder_id: folder_id || null,
      tags: [],
      created_at: now,
      updated_at: now,
    };

    setLinks(prev => [createdLink, ...prev]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion_id));

    try {
      const supabase = getSupabase();
      await supabase.from('links').insert({
        id: newLinkId,
        user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        url: item.send.url,
        title: createdLink.title,
        comment: createdLink.comment,
        domain: createdLink.domain,
        reading_status: item.reading_status || 'to_read',
        thumbnail_url: item.send.thumbnail_url,
        thumbnail_source: item.send.thumbnail_url ? 'auto' : 'none',
        category_id: category_id && isValidUUID(category_id) ? category_id : null,
        folder_id: folder_id && isValidUUID(folder_id) ? folder_id : null,
      });

      if (isValidUUID(suggestion_id)) {
        await supabase
          .from('send_recipients')
          .update({
            status: 'accepted',
            resulting_link_id: newLinkId,
            decided_at: now,
          })
          .eq('id', suggestion_id);
      }
    } catch (e) {
      console.warn('Supabase acceptSuggestion notice:', e);
    }

    syncAllFromSupabase();
  };

  const rejectSuggestion = async (suggestion_id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestion_id));

    if (isValidUUID(suggestion_id)) {
      try {
        const supabase = getSupabase();
        await supabase
          .from('send_recipients')
          .update({
            status: 'rejected',
            decided_at: new Date().toISOString(),
          })
          .eq('id', suggestion_id);
      } catch (e) {
        console.warn('Supabase rejectSuggestion notice:', e);
      }
    }

    syncAllFromSupabase();
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    const now = new Date().toISOString();
    setFriends(prev =>
      prev.map(f => (f.id === friendshipId ? { ...f, status: 'accepted', responded_at: now } : f))
    );

    if (isValidUUID(friendshipId)) {
      try {
        const supabase = getSupabase();
        await supabase
          .from('friendships')
          .update({
            status: 'accepted',
            responded_at: now,
          })
          .eq('id', friendshipId);
      } catch (e) {
        console.warn('Supabase acceptFriendRequest notice:', e);
      }
    }

    syncAllFromSupabase();
  };

  const removeFriend = async (friendshipId: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendshipId));

    if (isValidUUID(friendshipId)) {
      try {
        const supabase = getSupabase();
        await supabase.from('friendships').delete().eq('id', friendshipId);
      } catch (e) {
        console.warn('Supabase removeFriend notice:', e);
      }
    }

    syncAllFromSupabase();
  };

  const importBookmarks = async (items: ParsedBookmark[]) => {
    const folderPathMap = new Map<string, string>();
    let foldersCreated = 0;
    const now = new Date().toISOString();

    items.forEach(item => {
      let currentPath = '';
      let parentId: string | null = null;

      item.folderPath.forEach(folderName => {
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        if (!folderPathMap.has(currentPath)) {
          const newFId = generateUUID();
          const newFolder: Folder = {
            id: newFId,
            user_id: currentUser.id,
            category_id: null,
            parent_folder_id: parentId,
            name: folderName,
            created_at: now,
          };
          setFolders(prev => [...prev, newFolder]);
          folderPathMap.set(currentPath, newFId);
          foldersCreated++;
          parentId = newFId;
        } else {
          parentId = folderPathMap.get(currentPath)!;
        }
      });
    });

    const newLinks: Link[] = items.map(item => {
      const pathStr = item.folderPath.join('/');
      const folderId = pathStr ? folderPathMap.get(pathStr) || null : null;
      return {
        id: generateUUID(),
        user_id: currentUser.id,
        url: item.url,
        title: item.title,
        comment: null,
        domain: parseNormalizedDomain(item.url),
        reading_status: 'to_read',
        thumbnail_url: null,
        thumbnail_source: 'none',
        category_id: null,
        folder_id: folderId,
        tags: [],
        created_at: now,
        updated_at: now,
      };
    });

    setLinks(prev => [...newLinks, ...prev]);

    // Push to Supabase
    try {
      const supabase = getSupabase();
      for (const [, folderId] of Array.from(folderPathMap.entries())) {
        const f = folders.find(folder => folder.id === folderId);
        if (f) {
          await supabase.from('folders').insert({
            id: f.id,
            user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
            name: f.name,
            parent_folder_id: f.parent_folder_id && isValidUUID(f.parent_folder_id) ? f.parent_folder_id : null,
          });
        }
      }

      for (const l of newLinks) {
        await supabase.from('links').insert({
          id: l.id,
          user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
          url: l.url,
          title: l.title,
          domain: l.domain,
          reading_status: 'to_read',
          folder_id: l.folder_id && isValidUUID(l.folder_id) ? l.folder_id : null,
        });
      }
    } catch (e) {
      console.warn('Supabase importBookmarks notice:', e);
    }

    syncAllFromSupabase();
    return { importedCount: newLinks.length, foldersCount: foldersCreated };
  };

  const resetToSeed = async () => {
    localStorage.removeItem(STORAGE_KEY);
    await syncAllFromSupabase();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        links,
        categories,
        folders,
        tags,
        friends,
        suggestions,
        domainStats,
        isLoaded,
        addLink,
        updateLink,
        deleteLink,
        addCategory,
        deleteCategory,
        addFolder,
        moveFolder,
        deleteFolder,
        bulkMoveLinks,
        bulkTagLinks,
        bulkDeleteLinks,
        sendLinkToFriends,
        acceptSuggestion,
        rejectSuggestion,
        acceptFriendRequest,
        removeFriend,
        importBookmarks,
        resetToSeed,
        syncAllFromSupabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
