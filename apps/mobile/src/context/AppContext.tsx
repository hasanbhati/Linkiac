import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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
  extractDefaultThumbnail,
} from '@linkiac/shared';
import { supabase } from '../../lib/supabase';

const STORAGE_KEY = '@linkiac_mobile_store_v2';

export const defaultCurrentUser: Profile = {
  id: '',
  username: '',
  display_name: '',
  avatar_url: null,
  is_admin: false,
  status: 'active',
  created_at: new Date().toISOString(),
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
  thumbnail_url?: string | null;
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
  signOut: () => Promise<void>;
  addLink: (input: AddLinkInput) => Promise<Link>;
  updateLink: (id: string, updates: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  addFolder: (name: string, category_id?: string | null, parent_folder_id?: string | null) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  updateProfile: (updates: { username?: string; display_name?: string; avatar_url?: string | null }) => Promise<void>;
  acceptSuggestion: (suggestionId: string, options?: { category_id?: string | null; folder_id?: string | null }) => Promise<Link | null>;
  rejectSuggestion: (suggestionId: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  sendLinkToFriend: (data: { url: string; comment?: string | null; recipient_id: string }) => Promise<void>;
  bulkMoveLinks: (linkIds: string[], categoryId: string | null, folderId: string | null) => Promise<void>;
  bulkDeleteLinks: (linkIds: string[]) => Promise<void>;
  importBookmarks: (items: ParsedBookmark[]) => Promise<{ importedCount: number; foldersCount: number }>;
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
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [currentUser, setCurrentUser] = useState<Profile>(defaultCurrentUser);
  const [links, setLinks] = useState<Link[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<SendRecipient[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialSuggestionsSyncRef = useRef(true);
  const knownSuggestionIdsRef = useRef<Set<string>>(new Set());

  // Sign out handler (scoped locally to preserve sessions on other devices)
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Mobile signOut notice:', err);
    } finally {
      try {
        if (currentUser.id) {
          await AsyncStorage.removeItem(`@linkiac_cache_${currentUser.id}`);
        }
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch {}
      setCurrentUser(defaultCurrentUser);
      setLinks([]);
      setCategories([]);
      setFolders([]);
      setFriends([]);
      setSuggestions([]);
      routerRef.current.replace('/login');
    }
  }, [currentUser.id]);

  // Synchronize all domain entities from Supabase
  const syncAllFromSupabase = useCallback(async () => {
    try {
      // Check auth session
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (!authUser || !isValidUUID(authUser.id)) {
        return;
      }

      // Fetch active profile
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
        setCurrentUser(prev => ({
          ...prev,
          id: authUser.id,
          username: authUser.user_metadata?.username || prev.username,
          display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || prev.display_name,
        }));
      }

      const [linksRes, catsRes, foldersRes, friendsRes, suggestionsRes] = await Promise.allSettled([
        supabase
          .from('links')
          .select('*, link_tags(tag:tags(*))')
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
        const transformed: Link[] = linksRes.value.data.map((l: any) => ({
          id: l.id,
          user_id: l.user_id || authUser.id,
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

        const updatedSuggestions = incomingOnly.map(s => {
          const snd = s.send || sendMap.get(s.send_id);
          if (!snd) return s;
          const sender = snd.sender && snd.sender.username ? snd.sender : profileMap.get(snd.sender_id);
          return {
            ...s,
            send: {
              ...snd,
              sender: sender || snd.sender || null,
            },
          };
        });

        setSuggestions(updatedSuggestions);

        // Detect new incoming recommendations and trigger an in-app alert
        const currentSuggestionIds = new Set(updatedSuggestions.map(s => s.id));
        if (isInitialSuggestionsSyncRef.current) {
          knownSuggestionIdsRef.current = currentSuggestionIds;
          isInitialSuggestionsSyncRef.current = false;
        } else {
          const newSuggestions = updatedSuggestions.filter(s => !knownSuggestionIdsRef.current.has(s.id));
          if (newSuggestions.length > 0) {
            const first = newSuggestions[0];
            const senderName =
              first.send?.sender?.display_name ||
              (first.send?.sender?.username ? `@${first.send?.sender?.username}` : 'A friend');
            const alertTitle = 'New Recommendation Received!';
            const alertMessage =
              newSuggestions.length === 1
                ? `${senderName} recommended a link: "${first.send?.url || 'New link'}"`
                : `${senderName} and others sent you ${newSuggestions.length} new recommendations!`;

            Alert.alert(alertTitle, alertMessage, [
              { text: 'Later', style: 'cancel' },
              { text: 'View Inbox', onPress: () => routerRef.current.push('/(tabs)/inbox' as any) },
            ]);
          }
          knownSuggestionIdsRef.current = currentSuggestionIds;
        }
      }
    } catch (err) {
      console.warn('Linkiac mobile background sync notice:', err);
    }
  }, []);

  // Initialize and start polling
  useEffect(() => {
    // Initial sync
    syncAllFromSupabase();

    // Supabase Auth state change listener
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const userKey = `@linkiac_cache_${session.user.id}`;
          const stored = await AsyncStorage.getItem(userKey);
          if (stored) {
            const parsed = JSON.parse(stored);
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
        syncAllFromSupabase();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(defaultCurrentUser);
        setLinks([]);
        setCategories([]);
        setFolders([]);
        setFriends([]);
        setSuggestions([]);
        setIsLoaded(true);
      } else {
        setIsLoaded(true);
      }
    });

    // Auto-poll Supabase every 4 seconds so updates from Web appear on Mobile automatically
    const pollInterval = setInterval(() => {
      syncAllFromSupabase();
    }, 4000);

    // Sync when app comes to foreground
    const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncAllFromSupabase();
      }
    });

    return () => {
      authListener.unsubscribe();
      clearInterval(pollInterval);
      appStateSub.remove();
    };
  }, [syncAllFromSupabase]);

  // Persist to user-namespaced AsyncStorage cache
  useEffect(() => {
    if (!isLoaded || !isValidUUID(currentUser.id)) return;
    try {
      const userKey = `@linkiac_cache_${currentUser.id}`;
      AsyncStorage.setItem(
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
    } catch (err) {
      console.warn('Linkiac mobile cache write notice:', err);
    }
  }, [links, categories, folders, friends, suggestions, isLoaded, currentUser.id]);

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

    const defaultThumb = extractDefaultThumbnail(input.url);
    const resolvedThumbnail = input.thumbnail_url?.trim() || defaultThumb || null;

    const newLink: Link = {
      id: newId,
      user_id: currentUser.id,
      url: input.url.trim(),
      title: input.title?.trim() || null,
      comment: input.comment?.trim() || null,
      domain,
      reading_status: input.reading_status || 'to_read',
      thumbnail_url: resolvedThumbnail,
      thumbnail_source: resolvedThumbnail ? 'auto' : 'none',
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

    setLinks(prev => [newLink, ...prev]);

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
  }, [currentUser.id, syncAllFromSupabase]);

  const updateLink = useCallback(async (id: string, updates: Partial<Link>) => {
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l)));

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
  }, [syncAllFromSupabase]);

  const deleteLink = useCallback(async (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));

    if (isValidUUID(id)) {
      try {
        await supabase.from('link_tags').delete().eq('link_id', id);
        await supabase.from('links').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase mobile link delete notice:', e);
      }
    }

    syncAllFromSupabase();
  }, [syncAllFromSupabase]);

  const bulkMoveLinks = useCallback(async (
    linkIds: string[],
    categoryId: string | null,
    folderId: string | null
  ): Promise<void> => {
    const idSet = new Set(linkIds);
    const now = new Date().toISOString();
    setLinks(prev =>
      prev.map(l =>
        idSet.has(l.id) ? { ...l, category_id: categoryId, folder_id: folderId, updated_at: now } : l
      )
    );

    try {
      const validIds = linkIds.filter(isValidUUID);
      if (validIds.length > 0) {
        await supabase
          .from('links')
          .update({
            category_id: categoryId && isValidUUID(categoryId) ? categoryId : null,
            folder_id: folderId && isValidUUID(folderId) ? folderId : null,
            updated_at: now,
          })
          .in('id', validIds);
      }
    } catch (e) {
      console.warn('Supabase mobile bulkMoveLinks notice:', e);
    }

    syncAllFromSupabase();
  }, [syncAllFromSupabase]);

  const bulkDeleteLinks = useCallback(async (linkIds: string[]): Promise<void> => {
    const idSet = new Set(linkIds);
    setLinks(prev => prev.filter(l => !idSet.has(l.id)));

    try {
      const validIds = linkIds.filter(isValidUUID);
      if (validIds.length > 0) {
        await supabase.from('link_tags').delete().in('link_id', validIds);
        await supabase.from('links').delete().in('id', validIds);
      }
    } catch (e) {
      console.warn('Supabase mobile bulkDeleteLinks notice:', e);
    }

    syncAllFromSupabase();
  }, [syncAllFromSupabase]);

  const importBookmarks = useCallback(async (
    items: ParsedBookmark[]
  ): Promise<{ importedCount: number; foldersCount: number }> => {
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

    setFolders(prev => [...prev, ...createdFolders]);
    setLinks(prev => [...newLinks, ...prev]);

    try {
      if (isValidUUID(currentUser.id)) {
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
      console.warn('Supabase mobile importBookmarks notice:', e);
    }

    syncAllFromSupabase();
    return { importedCount: newLinks.length, foldersCount: foldersCreated };
  }, [currentUser.id, syncAllFromSupabase]);

  const addCategory = useCallback(async (name: string): Promise<Category> => {
    const catId = generateUUID();
    const newCategory: Category = {
      id: catId,
      user_id: currentUser.id,
      name: name.trim(),
      created_at: new Date().toISOString(),
    };

    setCategories(prev => [...prev, newCategory]);

    try {
      await supabase.from('categories').insert({
        id: catId,
        user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        name: name.trim(),
      });
    } catch (e) {
      console.warn('Supabase addCategory notice:', e);
    }

    syncAllFromSupabase();
    return newCategory;
  }, [currentUser.id, syncAllFromSupabase]);

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setFolders(fPrev => fPrev.map(f => (f.category_id === id ? { ...f, category_id: null } : f)));
    setLinks(lPrev => lPrev.map(l => (l.category_id === id ? { ...l, category_id: null } : l)));

    if (isValidUUID(id)) {
      try {
        await supabase.from('links').update({ category_id: null }).eq('category_id', id);
        await supabase.from('folders').update({ category_id: null }).eq('category_id', id);
        await supabase.from('categories').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase deleteCategory notice:', e);
      }
    }

    syncAllFromSupabase();
  }, [syncAllFromSupabase]);

  const addFolder = useCallback(async (
    name: string,
    category_id?: string | null,
    parent_folder_id?: string | null
  ): Promise<Folder> => {
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
      await supabase.from('folders').insert({
        id: folderId,
        user_id: isValidUUID(currentUser.id) ? currentUser.id : null,
        category_id: resolvedCategoryId && isValidUUID(resolvedCategoryId) ? resolvedCategoryId : null,
        parent_folder_id: parent_folder_id && isValidUUID(parent_folder_id) ? parent_folder_id : null,
        name: name.trim(),
      });
    } catch (e) {
      console.warn('Supabase addFolder notice:', e);
    }

    syncAllFromSupabase();
    return newFolder;
  }, [currentUser.id, folders, syncAllFromSupabase]);

  const deleteFolder = useCallback(async (id: string): Promise<void> => {
    const getDescendantIds = (folderId: string): string[] => {
      const children = folders.filter(f => f.parent_folder_id === folderId);
      return [folderId, ...children.flatMap(c => getDescendantIds(c.id))];
    };

    const idsToDelete = new Set(getDescendantIds(id));
    setFolders(prev => prev.filter(f => !idsToDelete.has(f.id)));
    setLinks(lPrev => lPrev.map(l => (l.folder_id && idsToDelete.has(l.folder_id) ? { ...l, folder_id: null } : l)));

    try {
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
  }, [folders, syncAllFromSupabase]);

  const updateProfile = useCallback(async (updates: {
    username?: string;
    display_name?: string;
    avatar_url?: string | null;
  }): Promise<void> => {
    if (!isValidUUID(currentUser.id)) return;

    const payload: any = {};
    if (updates.username) payload.username = updates.username.toLowerCase().trim();
    if (updates.display_name !== undefined) payload.display_name = updates.display_name.trim();
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;

    // Check username uniqueness if changing
    if (payload.username && payload.username !== currentUser.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', payload.username)
        .neq('id', currentUser.id)
        .maybeSingle();

      if (existing) {
        throw new Error(`Username @${payload.username} is already taken.`);
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', currentUser.id);

    if (error) throw error;

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

    await syncAllFromSupabase();
  }, [currentUser.id, currentUser.username, syncAllFromSupabase]);

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

    setLinks(prev => [createdLink, ...prev]);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

    // Push to Supabase via atomic RPC or fallback
    try {
      if (isValidUUID(currentUser.id) && isValidUUID(suggestionId)) {
        const { error: rpcErr } = await supabase.rpc('accept_friend_suggestion', {
          p_suggestion_id: suggestionId,
          p_category_id: options?.category_id && isValidUUID(options.category_id) ? options.category_id : null,
          p_folder_id: options?.folder_id && isValidUUID(options.folder_id) ? options.folder_id : null,
          p_custom_comment: item.send?.comment || null,
        });

        if (rpcErr) {
          console.warn('accept_friend_suggestion RPC notice, using fallback:', rpcErr);
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

          await supabase
            .from('send_recipients')
            .update({
              status: 'accepted',
              resulting_link_id: newLinkId,
              decided_at: now,
            })
            .eq('id', suggestionId);
        }
      }
    } catch (e) {
      console.warn('Supabase acceptSuggestion notice:', e);
    }

    syncAllFromSupabase();
    return createdLink;
  }, [suggestions, currentUser.id, syncAllFromSupabase]);

  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

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
  }, [syncAllFromSupabase]);

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    const now = new Date().toISOString();
    setFriends(prev =>
      prev.map(f =>
        f.id === friendshipId
          ? { ...f, status: 'accepted' as const, responded_at: now }
          : f
      )
    );

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
  }, [syncAllFromSupabase]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    setFriends(prev => prev.filter(f => f.id !== friendshipId));

    if (isValidUUID(friendshipId)) {
      try {
        await supabase.from('friendships').delete().eq('id', friendshipId);
      } catch (e) {
        console.warn('Supabase removeFriend notice:', e);
      }
    }

    syncAllFromSupabase();
  }, [syncAllFromSupabase]);

  const sendLinkToFriend = useCallback(async (data: { url: string; comment?: string | null; recipient_id: string }) => {
    const sendId = generateUUID();
    const recId = generateUUID();

    try {
      if (isValidUUID(currentUser.id) && isValidUUID(data.recipient_id)) {
        const { error: rpcErr } = await supabase.rpc('send_link_to_recipients', {
          p_url: data.url,
          p_comment: data.comment || null,
          p_recipient_ids: [data.recipient_id],
          p_source_link_id: null,
          p_thumbnail_url: null,
        });

        if (rpcErr) {
          console.warn('send_link_to_recipients RPC notice, using fallback:', rpcErr);
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
        }
      }
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
      signOut,
      addLink,
      updateLink,
      deleteLink,
      addCategory,
      deleteCategory,
      addFolder,
      deleteFolder,
      updateProfile,
      acceptSuggestion,
      rejectSuggestion,
      acceptFriendRequest,
      removeFriend,
      sendLinkToFriend,
      bulkMoveLinks,
      bulkDeleteLinks,
      importBookmarks,
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
      signOut,
      addLink,
      updateLink,
      deleteLink,
      addCategory,
      deleteCategory,
      addFolder,
      deleteFolder,
      updateProfile,
      acceptSuggestion,
      rejectSuggestion,
      acceptFriendRequest,
      removeFriend,
      sendLinkToFriend,
      bulkMoveLinks,
      bulkDeleteLinks,
      importBookmarks,
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
