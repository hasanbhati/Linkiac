import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
} from '@linkiac/shared';
import { supabase } from '../../lib/supabase';

const STORAGE_KEY = '@linkiac_mobile_store_v2';

export const defaultCurrentUser: Profile = {
  id: 'a0000000-0000-0000-0000-000000000001',
  username: 'admin_hasan',
  display_name: 'Hasan (Admin)',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  is_admin: true,
  status: 'active',
  created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
};

export const mockCurrentUser = defaultCurrentUser;

export interface AddLinkInput {
  url: string;
  title?: string | null;
  comment?: string | null;
  reading_status?: ReadingStatus;
  category_id?: string | null;
  folder_id?: string | null;
  tags?: string[];
}

interface AppContextType {
  currentUser: Profile;
  links: Link[];
  categories: Category[];
  folders: Folder[];
  friends: Friendship[];
  suggestions: SendRecipient[];
  domainStats: DomainStat[];
  isLoaded: boolean;
  addLink: (input: AddLinkInput) => Promise<Link>;
  updateLink: (id: string, updates: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  acceptSuggestion: (suggestionId: string, options?: { category_id?: string | null; folder_id?: string | null }) => Promise<Link | null>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  sendLinkToFriend: (data: { url: string; comment?: string | null; recipient_id: string }) => Promise<void>;
  syncAllFromSupabase: () => Promise<void>;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
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

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile>(defaultCurrentUser);
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<SendRecipient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to persist current state to AsyncStorage cache
  const persistState = useCallback(async (
    newLinks: Link[],
    newCategories: Category[],
    newFolders: Folder[],
    newFriends: Friendship[],
    newSuggestions: SendRecipient[]
  ) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          links: newLinks,
          categories: newCategories,
          folders: newFolders,
          friends: newFriends,
          suggestions: newSuggestions,
        })
      );
    } catch (err) {
      console.warn('Linkiac mobile cache write notice:', err);
    }
  }, []);

  // Synchronize all domain entities from Supabase
  const syncAllFromSupabase = useCallback(async () => {
    try {
      // Check auth session
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

      const [linksRes, catsRes, foldersRes, friendsRes, suggestionsRes] = await Promise.allSettled([
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
      ]);

      let updatedLinks = links;
      let updatedCats = categories;
      let updatedFolders = folders;
      let updatedFriends = friends;
      let updatedSuggestions = suggestions;

      if (linksRes.status === 'fulfilled' && !linksRes.value.error && Array.isArray(linksRes.value.data)) {
        updatedLinks = linksRes.value.data.map((l: any) => ({
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
        setLinks(updatedLinks);
      }

      if (catsRes.status === 'fulfilled' && !catsRes.value.error && Array.isArray(catsRes.value.data)) {
        updatedCats = catsRes.value.data;
        setCategories(updatedCats);
      }

      if (foldersRes.status === 'fulfilled' && !foldersRes.value.error && Array.isArray(foldersRes.value.data)) {
        updatedFolders = foldersRes.value.data;
        setFolders(updatedFolders);
      }

      if (friendsRes.status === 'fulfilled' && !friendsRes.value.error && Array.isArray(friendsRes.value.data)) {
        updatedFriends = friendsRes.value.data;
        setFriends(updatedFriends);
      }

      if (suggestionsRes.status === 'fulfilled' && !suggestionsRes.value.error && Array.isArray(suggestionsRes.value.data)) {
        updatedSuggestions = suggestionsRes.value.data;
        setSuggestions(updatedSuggestions);
      }

      // Update local storage cache
      persistState(updatedLinks, updatedCats, updatedFolders, updatedFriends, updatedSuggestions);
    } catch (err) {
      console.warn('Linkiac mobile background sync notice:', err);
    }
  }, [links, categories, folders, friends, suggestions, persistState]);

  // Load from AsyncStorage on mount and start polling
  useEffect(() => {
    async function init() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.links)) setLinks(parsed.links);
          if (Array.isArray(parsed.categories)) setCategories(parsed.categories);
          if (Array.isArray(parsed.folders)) setFolders(parsed.folders);
          if (Array.isArray(parsed.friends)) setFriends(parsed.friends);
          if (Array.isArray(parsed.suggestions)) setSuggestions(parsed.suggestions);
        }
      } catch (err) {
        console.warn('AsyncStorage init notice:', err);
      } finally {
        setIsLoaded(true);
      }

      // Initial sync
      syncAllFromSupabase();
    }

    init();

    // Auto-poll Supabase every 4 seconds so updates from Web appear on Mobile automatically
    const pollInterval = setInterval(() => {
      syncAllFromSupabase();
    }, 4000);

    // Sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncAllFromSupabase();
      }
    });

    return () => {
      clearInterval(pollInterval);
      subscription.remove();
    };
  }, [syncAllFromSupabase]);

  // Domain statistics derived dynamically from saved links
  const domainStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of links) {
      const domain = link.domain || parseNormalizedDomain(link.url);
      if (domain) {
        counts.set(domain, (counts.get(domain) || 0) + 1);
      }
    }
    const result: DomainStat[] = [];
    for (const [domain, count] of counts.entries()) {
      result.push({ domain, count });
    }
    result.sort((a, b) => b.count - a.count);
    return result;
  }, [links]);

  const addLink = useCallback(async (input: AddLinkInput): Promise<Link> => {
    const domain = parseNormalizedDomain(input.url);
    const newId = generateUUID();
    const now = new Date().toISOString();

    const newLink: Link = {
      id: newId,
      user_id: currentUser.id,
      url: input.url.trim(),
      title: input.title?.trim() || null,
      comment: input.comment?.trim() || null,
      domain,
      reading_status: input.reading_status || 'to_read',
      thumbnail_url: null,
      thumbnail_source: 'none',
      category_id: input.category_id || null,
      folder_id: input.folder_id || null,
      tags: (input.tags || []).map(t => ({
        id: generateUUID(),
        user_id: currentUser.id,
        name: t,
        created_at: now,
      })),
      created_at: now,
      updated_at: now,
    };

    setLinks(prev => {
      const updated = [newLink, ...prev];
      persistState(updated, categories, folders, friends, suggestions);
      return updated;
    });

    // Push to Supabase
    try {
      await supabase.from('links').insert({
        id: newId,
        user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        url: newLink.url,
        title: newLink.title,
        comment: newLink.comment,
        reading_status: newLink.reading_status,
        thumbnail_url: newLink.thumbnail_url,
        thumbnail_source: newLink.thumbnail_source,
        category_id: newLink.category_id && isValidUUID(newLink.category_id) ? newLink.category_id : null,
        folder_id: newLink.folder_id && isValidUUID(newLink.folder_id) ? newLink.folder_id : null,
        domain: newLink.domain,
      });

      // Handle tags
      for (const tag of newLink.tags || []) {
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
      console.warn('Supabase mobile link insert notice:', e);
    }

    syncAllFromSupabase();
    return newLink;
  }, [currentUser.id, categories, folders, friends, suggestions, persistState, syncAllFromSupabase]);

  const updateLink = useCallback(async (id: string, updates: Partial<Link>) => {
    setLinks(prev => {
      const updated = prev.map(l => (l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l));
      persistState(updated, categories, folders, friends, suggestions);
      return updated;
    });

    if (isValidUUID(id)) {
      try {
        const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
        delete dbUpdates.tags;
        delete dbUpdates.link_tags;
        if (dbUpdates.category_id && !isValidUUID(dbUpdates.category_id)) dbUpdates.category_id = null;
        if (dbUpdates.folder_id && !isValidUUID(dbUpdates.folder_id)) dbUpdates.folder_id = null;
        await supabase.from('links').update(dbUpdates).eq('id', id);
      } catch (e) {
        console.warn('Supabase mobile link update notice:', e);
      }
    }

    syncAllFromSupabase();
  }, [categories, folders, friends, suggestions, persistState, syncAllFromSupabase]);

  const deleteLink = useCallback(async (id: string) => {
    setLinks(prev => {
      const updated = prev.filter(l => l.id !== id);
      persistState(updated, categories, folders, friends, suggestions);
      return updated;
    });

    if (isValidUUID(id)) {
      try {
        await supabase.from('link_tags').delete().eq('link_id', id);
        await supabase.from('links').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase mobile link delete notice:', e);
      }
    }

    syncAllFromSupabase();
  }, [categories, folders, friends, suggestions, persistState, syncAllFromSupabase]);

  const acceptSuggestion = useCallback(async (
    suggestionId: string,
    options?: { category_id?: string | null; folder_id?: string | null }
  ): Promise<Link | null> => {
    const item = suggestions.find(s => s.id === suggestionId);
    if (!item) return null;

    const newLinkId = generateUUID();
    const domain = parseNormalizedDomain(item.send?.url || '');
    const now = new Date().toISOString();

    const createdLink: Link = {
      id: newLinkId,
      user_id: currentUser.id,
      url: item.send?.url || '',
      title: item.send?.sender ? `Shared by @${item.send.sender.username}` : 'Suggested link',
      comment: item.send?.comment || null,
      domain,
      reading_status: 'to_read',
      thumbnail_url: item.send?.thumbnail_url || null,
      thumbnail_source: item.send?.thumbnail_url ? 'auto' : 'none',
      category_id: options?.category_id || null,
      folder_id: options?.folder_id || null,
      tags: [],
      created_at: now,
      updated_at: now,
    };

    const newLinks = [createdLink, ...links];
    const newSuggestions = suggestions.filter(s => s.id !== suggestionId);

    setLinks(newLinks);
    setSuggestions(newSuggestions);
    persistState(newLinks, categories, folders, friends, newSuggestions);

    // Push to Supabase
    try {
      await supabase.from('links').insert({
        id: newLinkId,
        user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        url: item.send?.url || '',
        title: createdLink.title,
        comment: createdLink.comment,
        domain,
        reading_status: 'to_read',
        thumbnail_url: createdLink.thumbnail_url,
        thumbnail_source: createdLink.thumbnail_source,
        category_id: options?.category_id && isValidUUID(options.category_id) ? options.category_id : null,
        folder_id: options?.folder_id && isValidUUID(options.folder_id) ? options.folder_id : null,
      });

      if (isValidUUID(suggestionId)) {
        await supabase
          .from('send_recipients')
          .update({
            status: 'accepted',
            resulting_link_id: newLinkId,
            decided_at: now,
          })
          .eq('id', suggestionId);
      }
    } catch (e) {
      console.warn('Supabase acceptSuggestion notice:', e);
    }

    syncAllFromSupabase();
    return createdLink;
  }, [suggestions, links, currentUser.id, categories, folders, friends, persistState, syncAllFromSupabase]);

  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    const newSuggestions = suggestions.filter(s => s.id !== suggestionId);
    setSuggestions(newSuggestions);
    persistState(links, categories, folders, friends, newSuggestions);

    if (isValidUUID(suggestionId)) {
      try {
        await supabase
          .from('send_recipients')
          .update({
            status: 'rejected',
            decided_at: new Date().toISOString(),
          })
          .eq('id', suggestionId);
      } catch (e) {
        console.warn('Supabase rejectSuggestion notice:', e);
      }
    }

    syncAllFromSupabase();
  }, [suggestions, links, categories, folders, friends, persistState, syncAllFromSupabase]);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    const now = new Date().toISOString();
    const newFriends = friends.map(f =>
      f.id === friendshipId
        ? { ...f, status: 'accepted' as const, responded_at: now }
        : f
    );
    setFriends(newFriends);
    persistState(links, categories, folders, newFriends, suggestions);

    if (isValidUUID(friendshipId)) {
      try {
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
  }, [friends, links, categories, folders, suggestions, persistState, syncAllFromSupabase]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const newFriends = friends.filter(f => f.id !== friendshipId);
    setFriends(newFriends);
    persistState(links, categories, folders, newFriends, suggestions);

    if (isValidUUID(friendshipId)) {
      try {
        await supabase.from('friendships').delete().eq('id', friendshipId);
      } catch (e) {
        console.warn('Supabase removeFriend notice:', e);
      }
    }

    syncAllFromSupabase();
  }, [friends, links, categories, folders, suggestions, persistState, syncAllFromSupabase]);

  const sendLinkToFriend = useCallback(async (data: { url: string; comment?: string | null; recipient_id: string }) => {
    const sendId = generateUUID();
    const recId = generateUUID();

    try {
      await supabase.from('sends').insert({
        id: sendId,
        sender_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        url: data.url,
        comment: data.comment || null,
      });

      await supabase.from('send_recipients').insert({
        id: recId,
        send_id: sendId,
        recipient_id: data.recipient_id,
        status: 'pending',
        reading_status: 'to_read',
      });
    } catch (e) {
      console.warn('Supabase sendLinkToFriend notice:', e);
    }

    syncAllFromSupabase();
  }, [currentUser.id, syncAllFromSupabase]);

  const value = useMemo(
    () => ({
      currentUser,
      links,
      categories,
      folders,
      friends,
      suggestions,
      domainStats,
      isLoaded,
      addLink,
      updateLink,
      deleteLink,
      acceptSuggestion,
      rejectSuggestion,
      acceptFriendRequest,
      removeFriend,
      sendLinkToFriend,
      syncAllFromSupabase,
    }),
    [
      currentUser,
      links,
      categories,
      folders,
      friends,
      suggestions,
      domainStats,
      isLoaded,
      addLink,
      updateLink,
      deleteLink,
      acceptSuggestion,
      rejectSuggestion,
      acceptFriendRequest,
      removeFriend,
      sendLinkToFriend,
      syncAllFromSupabase,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
