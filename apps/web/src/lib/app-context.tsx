'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Profile,
  Category,
  Folder,
  Link,
  Friendship,
  SendRecipient,
  DomainStat,
  ReadingStatus,
  parseNormalizedDomain,
  ParsedBookmark,
  extractDefaultThumbnail,
  packSharedComment,
  unpackSharedComment,
} from '@linkiac/shared';
import { defaultCurrentUser } from './constants';
import { getSupabase } from './supabase/client';

interface AppContextType {
  currentUser: Profile;
  links: Link[];
  categories: Category[];
  folders: Folder[];
  friends: Friendship[];
  suggestions: SendRecipient[];
  domainStats: DomainStat[];
  isLoaded: boolean;
  signOut: () => Promise<void>;
  // Actions
  addLink: (link: {
    url: string;
    title?: string | null;
    comment?: string | null;
    reading_status?: ReadingStatus;
    category_id?: string | null;
    folder_id?: string | null;
    thumbnail_url?: string | null;
  }) => Promise<Link>;
  updateLink: (id: string, updates: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  addCategory: (name: string) => Category;
  deleteCategory: (id: string) => Promise<void>;
  updateProfile: (updates: { username?: string; display_name?: string; avatar_url?: string | null }) => Promise<void>;
  addFolder: (name: string, category_id?: string | null, parent_folder_id?: string | null) => Folder;
  moveFolder: (folder_id: string, new_parent_folder_id: string | null, new_category_id?: string | null) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<void>;
  bulkMoveLinks: (link_ids: string[], category_id: string | null, folder_id: string | null) => Promise<void>;
  bulkDeleteLinks: (link_ids: string[]) => Promise<void>;
  sendLinkToFriends: (data: {
    url: string;
    title?: string | null;
    comment?: string | null;
    recipient_ids: string[];
    source_link_id?: string | null;
    thumbnail_url?: string | null;
  }) => Promise<void>;
  acceptSuggestion: (
    suggestion_id: string,
    category_id: string | null,
    folder_id: string | null,
    customComment?: string | null,
    customTitle?: string | null
  ) => Promise<void>;
  rejectSuggestion: (suggestion_id: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  importBookmarks: (items: ParsedBookmark[]) => Promise<{ importedCount: number; foldersCount: number }>;
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

export function isValidUUID(str?: string | null): boolean {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile>(defaultCurrentUser);
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<SendRecipient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sign out handler (scoped locally to preserve sessions on other devices)
  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      try {
        if (currentUser.id) {
          localStorage.removeItem(`linkiac_cache_${currentUser.id}`);
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setCurrentUser(defaultCurrentUser);
      setLinks([]);
      setCategories([]);
      setFolders([]);
      setFriends([]);
      setSuggestions([]);
      window.location.href = '/login';
    }
  }, [currentUser.id]);

  // Synchronize all domain entities from Supabase
  const syncAllFromSupabase = useCallback(async () => {
    try {
      const supabase = getSupabase();

      // Check current authenticated user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || !isValidUUID(authUser.id)) {
        return;
      }

      // Fetch active user profile from public.profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profile) {
        setCurrentUser(prev => {
          if (
            prev.id === profile.id &&
            prev.username === profile.username &&
            prev.display_name === profile.display_name &&
            prev.avatar_url === profile.avatar_url &&
            prev.is_admin === profile.is_admin &&
            prev.status === profile.status
          ) {
            return prev;
          }
          return profile;
        });
      } else {
        setCurrentUser(prev => {
          const newUsername = authUser.user_metadata?.username || prev.username;
          const newDisplayName = authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || prev.display_name;
          if (prev.id === authUser.id && prev.username === newUsername && prev.display_name === newDisplayName) {
            return prev;
          }
          return {
            ...prev,
            id: authUser.id,
            username: newUsername,
            display_name: newDisplayName,
          };
        });
      }

      const [linksRes, catsRes, foldersRes, friendsRes, suggestionsRes] = await Promise.allSettled([
        supabase
          .from('links')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', authUser.id)
          .order('name', { ascending: true }),
        supabase
          .from('folders')
          .select('*')
          .eq('user_id', authUser.id)
          .order('name', { ascending: true }),
        supabase
          .from('friendships')
          .select('*, requester:profiles!friendships_requester_id_fkey(*), recipient:profiles!friendships_recipient_id_fkey(*)')
          .or(`requester_id.eq.${authUser.id},recipient_id.eq.${authUser.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('send_recipients')
          .select('*, send:sends(*, sender:profiles!sends_sender_id_fkey(*))')
          .eq('recipient_id', authUser.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      if (linksRes.status === 'fulfilled' && !linksRes.value.error && Array.isArray(linksRes.value.data)) {
        const transformed: Link[] = linksRes.value.data.map((l: any) => {
          const rawTitle = l.title ? String(l.title).trim() : '';
          const isPollutedTitle = !rawTitle || rawTitle.toLowerCase().startsWith('shared by @');
          const cleanTitle = isPollutedTitle
            ? (l.domain || parseNormalizedDomain(l.url) || l.url || 'Saved link')
            : rawTitle;

          // Auto-heal legacy database rows asynchronously
          if (isPollutedTitle && l.id && isValidUUID(l.id)) {
            const supabase = getSupabase();
            supabase.from('links').update({ title: cleanTitle }).eq('id', l.id).then(() => {});
          }

          return {
            id: l.id,
            user_id: l.user_id || authUser.id,
            url: l.url,
            title: cleanTitle,
            comment: l.comment || null,
            domain: l.domain || parseNormalizedDomain(l.url),
            reading_status: l.reading_status || 'to_read',
            thumbnail_url: l.thumbnail_url || null,
            thumbnail_source: l.thumbnail_source || (l.thumbnail_url ? 'auto' : 'none'),
            category_id: l.category_id || null,
            folder_id: l.folder_id || null,
            created_at: l.created_at,
            updated_at: l.updated_at || l.created_at,
          };
        });
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
        const rawSuggestions: any[] = suggestionsRes.value.data;

        // Check if any suggestions lack the joined send record
        const missingSendIds = rawSuggestions.filter(s => !s.send && s.send_id).map(s => s.send_id);
        const sendMap = new Map<string, any>();
        if (missingSendIds.length > 0) {
          const { data: fetchedSends } = await supabase.from('sends').select('*').in('id', missingSendIds);
          (fetchedSends || []).forEach(snd => sendMap.set(snd.id, snd));
        }

        // Check if any send record lacks sender profile
        const senderIds = new Set<string>();
        rawSuggestions.forEach(s => {
          const snd = s.send || sendMap.get(s.send_id);
          if (snd && snd.sender_id && (!snd.sender || !snd.sender.username)) {
            senderIds.add(snd.sender_id);
          }
        });

        const profileMap = new Map<string, any>();
        if (senderIds.size > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(senderIds));
          (profiles || []).forEach(p => profileMap.set(p.id, p));
        }

        const incomingOnly = rawSuggestions.filter(
          s => s.recipient_id === authUser.id && (!s.send || s.send.sender_id !== authUser.id)
        );

        const hydrated: SendRecipient[] = incomingOnly.map(s => {
          const snd = s.send || sendMap.get(s.send_id);
          if (!snd) return s;
          const sender = snd.sender && snd.sender.username ? snd.sender : profileMap.get(snd.sender_id);
          const { title: unpackedTitle, note: unpackedNote } = unpackSharedComment(snd.comment);
          const effectiveSendTitle = snd.title || unpackedTitle || snd.source_link?.title || null;
          const effectiveSendComment = unpackedTitle ? unpackedNote : snd.comment;

          return {
            ...s,
            send: {
              ...snd,
              title: effectiveSendTitle,
              comment: effectiveSendComment,
              sender: sender || snd.sender || null,
            },
          };
        });

        setSuggestions(hydrated);
      }
    } catch (err) {
      console.warn('Linkiac web sync notice:', err);
    }
  }, []);

  // Initialize and trigger initial sync
  useEffect(() => {
    // Initial background sync
    syncAllFromSupabase();

    // Supabase auth state change subscription
    const supabase = getSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Load user-namespaced cache if available
        try {
          const userKey = `linkiac_cache_${session.user.id}`;
          const saved = localStorage.getItem(userKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.userId === session.user.id) {
              if (Array.isArray(parsed.links)) setLinks(parsed.links);
              if (Array.isArray(parsed.categories)) setCategories(parsed.categories);
              if (Array.isArray(parsed.folders)) setFolders(parsed.folders);
              if (Array.isArray(parsed.friends)) setFriends(parsed.friends);
              if (Array.isArray(parsed.suggestions)) {
                setSuggestions(
                  parsed.suggestions.filter(
                    (s: any) => s.recipient_id === session.user.id && (!s.send || s.send.sender_id !== session.user.id)
                  )
                );
              }
            }
          }
        } catch {}
        setIsLoaded(true);
        await syncAllFromSupabase();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(defaultCurrentUser);
        setLinks([]);
        setCategories([]);
        setFolders([]);
        setFriends([]);
        setSuggestions([]);
      }
    });

    // Controlled polling: every 20s when tab is visible, sync immediately on tab focus
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        syncAllFromSupabase();
      }
    }, 20000);

    // Window focus & visibility change sync
    const handleFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        syncAllFromSupabase();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncAllFromSupabase]);

  // Persist to user-namespaced localStorage cache
  useEffect(() => {
    if (!isLoaded || !isValidUUID(currentUser.id)) return;
    try {
      const userKey = `linkiac_cache_${currentUser.id}`;
      localStorage.setItem(
        userKey,
        JSON.stringify({
          userId: currentUser.id,
          links,
          categories,
          folders,
          friends,
          suggestions,
        })
      );
    } catch {
      // Quota exceeded
    }
  }, [links, categories, folders, friends, suggestions, isLoaded, currentUser.id]);

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
    thumbnail_url?: string | null;
  }): Promise<Link> => {
    const domain = parseNormalizedDomain(data.url);
    const now = new Date().toISOString();
    const newId = generateUUID();

    const resolvedThumbnail = data.thumbnail_url?.trim() || extractDefaultThumbnail(data.url) || null;

    let resolvedCategoryId = data.category_id || null;
    if (data.folder_id && !resolvedCategoryId) {
      const parent = folders.find(f => f.id === data.folder_id);
      if (parent?.category_id) resolvedCategoryId = parent.category_id;
    }

    const newLink: Link = {
      id: newId,
      user_id: currentUser.id,
      url: data.url,
      title: data.title || null,
      comment: data.comment || null,
      domain,
      reading_status: data.reading_status || 'to_read',
      thumbnail_url: resolvedThumbnail,
      thumbnail_source: resolvedThumbnail ? 'auto' : 'none',
      category_id: resolvedCategoryId,
      folder_id: data.folder_id || null,
      created_at: now,
      updated_at: now,
    };

    // Optimistic local state update
    const prevLinks = links;
    setLinks(prev => [newLink, ...prev]);

    // Push to Supabase
    try {
      const supabase = getSupabase();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const effectiveUserId = authUser?.id || (isValidUUID(currentUser.id) ? currentUser.id : null);

      if (effectiveUserId) {
        const { error: linkErr } = await supabase.from('links').insert({
          id: newId,
          user_id: effectiveUserId,
          url: data.url,
          title: data.title || null,
          comment: data.comment || null,
          domain,
          reading_status: data.reading_status || 'to_read',
          thumbnail_url: resolvedThumbnail,
          thumbnail_source: resolvedThumbnail ? 'auto' : 'none',
          category_id: resolvedCategoryId && isValidUUID(resolvedCategoryId) ? resolvedCategoryId : null,
          folder_id: data.folder_id && isValidUUID(data.folder_id) ? data.folder_id : null,
        });

        if (linkErr) throw linkErr;
      }
    } catch (e) {
      console.warn('Supabase addLink error, rolling back:', e);
      setLinks(prevLinks);
      throw e;
    }

    syncAllFromSupabase();
    return newLink;
  };

  const updateLink = async (id: string, updates: Partial<Link>): Promise<void> => {
    const prevLinks = links;

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
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        const effectiveUserId = authUser?.id || (isValidUUID(currentUser.id) ? currentUser.id : null);

        if (effectiveUserId) {
          const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
          if (dbUpdates.category_id && !isValidUUID(dbUpdates.category_id)) dbUpdates.category_id = null;
          if (dbUpdates.folder_id && !isValidUUID(dbUpdates.folder_id)) dbUpdates.folder_id = null;
          const { error } = await supabase.from('links').update(dbUpdates).eq('id', id);
          if (error) throw error;
        }
      } catch (e) {
        console.warn('Supabase updateLink error, rolling back:', e);
        setLinks(prevLinks);
      }
    }

    syncAllFromSupabase();
  };

  const deleteLink = async (id: string): Promise<void> => {
    const prevLinks = links;
    setLinks(prev => prev.filter(l => l.id !== id));

    if (isValidUUID(id)) {
      try {
        const supabase = getSupabase();
        const { error } = await supabase.from('links').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.warn('Supabase deleteLink error, rolling back:', e);
        setLinks(prevLinks);
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

  const updateProfile = async (updates: {
    username?: string;
    display_name?: string;
    avatar_url?: string | null;
  }): Promise<void> => {
    const supabase = getSupabase();

    if (updates.username) {
      const clean = updates.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .neq('id', currentUser.id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Username @${clean} is already taken. Please choose another.`);
      }
    }

    const payload: Partial<Profile> = {};
    if (updates.username !== undefined) {
      payload.username = updates.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    }
    if (updates.display_name !== undefined) {
      payload.display_name = updates.display_name.trim() || payload.username || currentUser.username;
    }
    if (updates.avatar_url !== undefined) {
      payload.avatar_url = updates.avatar_url ? updates.avatar_url.trim() : null;
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', currentUser.id);

    if (profileErr) throw profileErr;

    await supabase.auth.updateUser({
      data: {
        ...(payload.username ? { username: payload.username } : {}),
        ...(payload.display_name ? { full_name: payload.display_name } : {}),
        ...(payload.avatar_url !== undefined ? { avatar_url: payload.avatar_url } : {}),
      },
    });

    setCurrentUser(prev => ({
      ...prev,
      ...payload,
    }));

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
    let resolvedCategoryId = category_id || null;
    if (folder_id && !resolvedCategoryId) {
      const parent = folders.find(f => f.id === folder_id);
      if (parent?.category_id) resolvedCategoryId = parent.category_id;
    }

    const prevLinks = links;
    const idSet = new Set(link_ids);
    setLinks(prev =>
      prev.map(l => (idSet.has(l.id) ? { ...l, category_id: resolvedCategoryId, folder_id, updated_at: new Date().toISOString() } : l))
    );

    try {
      const supabase = getSupabase();
      const validLinkIds = link_ids.filter(isValidUUID);
      if (validLinkIds.length > 0) {
        const { error } = await supabase
          .from('links')
          .update({
            category_id: resolvedCategoryId && isValidUUID(resolvedCategoryId) ? resolvedCategoryId : null,
            folder_id: folder_id && isValidUUID(folder_id) ? folder_id : null,
            updated_at: new Date().toISOString(),
          })
          .in('id', validLinkIds);
        if (error) throw error;
      }
    } catch (e) {
      console.warn('Supabase bulkMoveLinks error, rolling back:', e);
      setLinks(prevLinks);
    }

    syncAllFromSupabase();
  };

  const bulkDeleteLinks = async (link_ids: string[]) => {
    const prevLinks = links;
    const idSet = new Set(link_ids);
    setLinks(prev => prev.filter(l => !idSet.has(l.id)));

    try {
      const supabase = getSupabase();
      const validLinkIds = link_ids.filter(isValidUUID);
      if (validLinkIds.length > 0) {
        const { error } = await supabase.from('links').delete().in('id', validLinkIds);
        if (error) throw error;
      }
    } catch (e) {
      console.warn('Supabase bulkDeleteLinks error, rolling back:', e);
      setLinks(prevLinks);
    }

    syncAllFromSupabase();
  };

  const sendLinkToFriends = async (data: {
    url: string;
    title?: string | null;
    comment?: string | null;
    recipient_ids: string[];
    source_link_id?: string | null;
    thumbnail_url?: string | null;
  }) => {
    const validRecipientIds = (data.recipient_ids || []).filter(isValidUUID);
    const trimmedUrl = data.url ? data.url.trim() : '';

    if (!trimmedUrl) {
      throw new Error('URL is required to share.');
    }
    if (validRecipientIds.length === 0) {
      throw new Error('Please select at least one valid friend to send to.');
    }

    const supabase = getSupabase();
    // Resolve authenticated user ID
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const effectiveUserId = authUser?.id || (isValidUUID(currentUser.id) ? currentUser.id : null);
    if (!effectiveUserId) {
      throw new Error('You must be signed in to send link recommendations.');
    }

    const comment = data.comment?.trim() || null;
    const sourceLinkId = data.source_link_id && isValidUUID(data.source_link_id) ? data.source_link_id : null;
    const thumbnailUrl = data.thumbnail_url || null;
    const title = data.title?.trim() || null;
    const packedComment = packSharedComment(title, comment);

    let sendSuccess = false;

    // TIER 1: Attempt atomic RPC with 6 parameters (including p_title)
    try {
      const { error: rpc6Err } = await supabase.rpc('send_link_to_recipients', {
        p_url: trimmedUrl,
        p_comment: packedComment,
        p_recipient_ids: validRecipientIds,
        p_source_link_id: sourceLinkId,
        p_thumbnail_url: thumbnailUrl,
        p_title: title,
      });

      if (!rpc6Err) {
        sendSuccess = true;
      } else {
        const isSignatureMismatch =
          rpc6Err.code === 'PGRST202' ||
          rpc6Err.message?.toLowerCase().includes('schema cache') ||
          rpc6Err.message?.toLowerCase().includes('could not find the function');

        if (isSignatureMismatch) {
          // TIER 2: Fallback to existing 5-parameter RPC signature in production database
          const { data: rpc5SendId, error: rpc5Err } = await supabase.rpc('send_link_to_recipients', {
            p_url: trimmedUrl,
            p_comment: packedComment,
            p_recipient_ids: validRecipientIds,
            p_source_link_id: sourceLinkId,
            p_thumbnail_url: thumbnailUrl,
          });

          if (!rpc5Err) {
            sendSuccess = true;
            if (rpc5SendId && title) {
              supabase.from('sends').update({ title }).eq('id', rpc5SendId).then(() => {});
            }
          } else {
            console.warn('5-param send_link_to_recipients RPC failed:', rpc5Err);
          }
        } else {
          console.warn('6-param send_link_to_recipients RPC failed:', rpc6Err);
        }
      }
    } catch (rpcEx) {
      console.warn('RPC execution exception, attempting direct fallback:', rpcEx);
    }

    // TIER 3: Direct table insert fallback
    if (!sendSuccess) {
      const sendId = generateUUID();
      const baseSendPayload = {
        id: sendId,
        sender_id: effectiveUserId,
        url: trimmedUrl,
        comment: packedComment,
        thumbnail_url: thumbnailUrl,
        source_link_id: sourceLinkId,
      };

      let insertErr: any = null;
      if (title) {
        const { error } = await supabase.from('sends').insert({
          ...baseSendPayload,
          title: title,
        });
        insertErr = error;
      } else {
        const { error } = await supabase.from('sends').insert(baseSendPayload);
        insertErr = error;
      }

      // If failed due to missing sends.title column (code 42703), retry without title
      if (insertErr && (insertErr.code === '42703' || insertErr.message?.toLowerCase().includes('title'))) {
        const { error: retryErr } = await supabase.from('sends').insert(baseSendPayload);
        insertErr = retryErr;
      }

      if (insertErr) {
        console.error('Direct send master insert failed:', insertErr);
        throw new Error(insertErr.message || 'Failed to create recommendation master record.');
      }

      const recipientRows = validRecipientIds
        .filter(rid => rid !== effectiveUserId)
        .map(recipientId => ({
          id: generateUUID(),
          send_id: sendId,
          recipient_id: recipientId,
          status: 'pending',
          reading_status: 'to_read',
        }));

      if (recipientRows.length > 0) {
        const { error: recErr } = await supabase.from('send_recipients').insert(recipientRows);
        if (recErr) {
          console.error('Direct send_recipients insert failed:', recErr);
          throw new Error(recErr.message || 'Failed to deliver recommendations to selected friends.');
        }
      }

      sendSuccess = true;
    }

    syncAllFromSupabase();
  };

  const acceptSuggestion = async (
    suggestion_id: string,
    category_id: string | null,
    folder_id: string | null,
    customComment?: string | null,
    customTitle?: string | null
  ) => {
    const item = suggestions.find(s => s.id === suggestion_id);
    if (!item || !item.send) return;

    const newLinkId = generateUUID();
    const now = new Date().toISOString();

    const { title: unpackedTitle, note: unpackedNote } = unpackSharedComment(item.send.comment);
    const rawSendTitle = item.send.title ? String(item.send.title).trim() : '';
    const rawSourceTitle = item.send.source_link?.title ? String(item.send.source_link.title).trim() : '';
    const userTitle = customTitle ? String(customTitle).trim() : '';
    let effectiveTitle = userTitle || rawSendTitle || unpackedTitle || rawSourceTitle;

    // Never allow 'Shared by @...' to become the link title
    if (!effectiveTitle || effectiveTitle.toLowerCase().startsWith('shared by @')) {
      effectiveTitle = parseNormalizedDomain(item.send.url) || item.send.url || 'Saved link';
    }

    let resolvedCategoryId = category_id || null;
    if (folder_id && !resolvedCategoryId) {
      const parent = folders.find(f => f.id === folder_id);
      if (parent?.category_id) resolvedCategoryId = parent.category_id;
    }

    const createdLink: Link = {
      id: newLinkId,
      user_id: currentUser.id,
      url: item.send.url,
      title: effectiveTitle,
      comment: customComment !== undefined ? customComment : (unpackedTitle ? unpackedNote : item.send.comment),
      domain: parseNormalizedDomain(item.send.url),
      reading_status: item.reading_status,
      thumbnail_url: item.send.thumbnail_url,
      thumbnail_source: item.send.thumbnail_url ? 'auto' : 'none',
      category_id: resolvedCategoryId,
      folder_id: folder_id || null,
      created_at: now,
      updated_at: now,
    };

    setLinks(prev => [createdLink, ...prev]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion_id));

    try {
      const supabase = getSupabase();
      if (isValidUUID(currentUser.id) && isValidUUID(suggestion_id)) {
        // Persist to Supabase: direct insert first with correct title, update suggestion status
        const { error: insertErr } = await supabase.from('links').insert({
          id: newLinkId,
          user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
          url: item.send.url,
          title: effectiveTitle,
          comment: createdLink.comment,
          domain: createdLink.domain,
          reading_status: item.reading_status || 'to_read',
          thumbnail_url: item.send.thumbnail_url,
          thumbnail_source: item.send.thumbnail_url ? 'auto' : 'none',
          category_id: resolvedCategoryId && isValidUUID(resolvedCategoryId) ? resolvedCategoryId : null,
          folder_id: folder_id && isValidUUID(folder_id) ? folder_id : null,
        });

        if (!insertErr) {
          await supabase
            .from('send_recipients')
            .update({
              status: 'accepted',
              resulting_link_id: newLinkId,
              decided_at: now,
            })
            .eq('id', suggestion_id);
        } else {
          console.warn('Direct link insert notice, attempting RPC fallback:', insertErr);
          const { data: rpcLinkId, error: rpcErr } = await supabase.rpc('accept_friend_suggestion', {
            p_suggestion_id: suggestion_id,
            p_category_id: category_id && isValidUUID(category_id) ? category_id : null,
            p_folder_id: folder_id && isValidUUID(folder_id) ? folder_id : null,
            p_custom_comment: customComment !== undefined ? customComment : null,
          });

          // Enforce clean title if legacy RPC set it to 'Shared by @...'
          if (!rpcErr && rpcLinkId) {
            await supabase.from('links').update({ title: effectiveTitle }).eq('id', rpcLinkId);
          }
        }
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
    const createdFolders: Folder[] = [];

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
          createdFolders.push(newFolder);
          folderPathMap.set(currentPath, newFId);
          foldersCreated++;
          parentId = newFId;
        } else {
          parentId = folderPathMap.get(currentPath)!;
        }
      });
    });

    if (createdFolders.length > 0) {
      setFolders(prev => [...prev, ...createdFolders]);
    }

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
        created_at: now,
        updated_at: now,
      };
    });

    setLinks(prev => [...newLinks, ...prev]);

    // Push to Supabase via batch inserts
    try {
      const supabase = getSupabase();
      if (isValidUUID(currentUser.id)) {
        // 1. Record import batch
        const batchId = generateUUID();
        await supabase.from('import_batches').insert({
          id: batchId,
          user_id: currentUser.id,
          source: 'browser_html',
          created_at: now,
        });

        // 2. Batch insert folders (in creation order to respect parent_folder_id hierarchy)
        if (createdFolders.length > 0) {
          for (const f of createdFolders) {
            await supabase.from('folders').upsert({
              id: f.id,
              user_id: currentUser.id,
              name: f.name,
              parent_folder_id: f.parent_folder_id && isValidUUID(f.parent_folder_id) ? f.parent_folder_id : null,
              category_id: null,
              created_at: f.created_at,
            });
          }
        }

        // 3. Batch insert links in chunks of 50
        const linkRows = newLinks.map(l => ({
          id: l.id,
          user_id: currentUser.id,
          url: l.url,
          title: l.title,
          domain: l.domain,
          reading_status: 'to_read',
          folder_id: l.folder_id && isValidUUID(l.folder_id) ? l.folder_id : null,
          category_id: null,
          created_at: l.created_at,
          updated_at: l.updated_at,
        }));

        for (let i = 0; i < linkRows.length; i += 50) {
          const chunk = linkRows.slice(i, i + 50);
          await supabase.from('links').insert(chunk);
        }
      }
    } catch (e) {
      console.warn('Supabase importBookmarks error:', e);
    }

    syncAllFromSupabase();
    return { importedCount: newLinks.length, foldersCount: foldersCreated };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        links,
        categories,
        folders,
        friends,
        suggestions,
        domainStats,
        isLoaded,
        signOut,
        addLink,
        updateLink,
        deleteLink,
        addCategory,
        deleteCategory,
        updateProfile,
        addFolder,
        moveFolder,
        deleteFolder,
        bulkMoveLinks,
        bulkDeleteLinks,
        sendLinkToFriends,
        acceptSuggestion,
        rejectSuggestion,
        acceptFriendRequest,
        removeFriend,
        importBookmarks,
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
