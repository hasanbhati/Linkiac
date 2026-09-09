export type ReadingStatus = 'to_read' | 'reading' | 'done';
export type ThumbnailSource = 'auto' | 'manual' | 'none';
export type UserStatus = 'active' | 'suspended';
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';
export type ImportBatchStatus = 'pending' | 'imported' | 'skipped';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  status: UserStatus;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  folders_count?: number;
  links_count?: number;
}

export interface Folder {
  id: string;
  user_id: string;
  category_id: string | null;
  parent_folder_id: string | null;
  name: string;
  created_at: string;
  updated_at?: string;
  children?: Folder[];
  links_count?: number;
  depth?: number;
}

export interface Link {
  id: string;
  user_id: string;
  url: string; // Free text, unconstrained
  title: string | null;
  comment: string | null; // Personal comment/annotation
  domain: string | null;
  reading_status: ReadingStatus;
  thumbnail_url: string | null;
  thumbnail_source: ThumbnailSource;
  category_id: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
  requester?: Profile;
  recipient?: Profile;
}

export interface Send {
  id: string;
  sender_id: string;
  url: string;
  title?: string | null;
  comment: string | null; // Message from sender
  thumbnail_url: string | null;
  source_link_id: string | null;
  source_link?: Link;
  created_at: string;
  sender?: Profile;
  recipients_count?: number;
}

export interface SendRecipient {
  id: string;
  send_id: string;
  recipient_id: string;
  status: SuggestionStatus;
  reading_status: ReadingStatus;
  resulting_link_id: string | null;
  created_at: string;
  decided_at: string | null;
  send?: Send;
}

export interface ImportBatch {
  id: string;
  user_id: string;
  source: string;
  created_at: string;
  total_items?: number;
  duplicate_items?: number;
}

export interface ImportItem {
  id: string;
  batch_id: string;
  url: string;
  title: string | null;
  folder_path: string | null;
  duplicate_link_id: string | null;
  status: ImportBatchStatus;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  actor_admin_id: string;
  target_user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DomainStat {
  domain: string;
  count: number;
}

export interface LibraryFilter {
  categoryId?: string | null;
  folderId?: string | null;
  unfiledOnly?: boolean;
  readingStatus?: ReadingStatus | 'all';
  searchQuery?: string;
}
