import { z } from 'zod';

export const readingStatusSchema = z.enum(['to_read', 'reading', 'done']);

export const createLinkSchema = z.object({
  // Intentionally unconstrained string for URL — saves broken links, sentences, arbitrary text!
  url: z.string().min(1, 'URL or text is required'),
  title: z.string().max(500).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  reading_status: readingStatusSchema.default('to_read'),
  category_id: z.string().uuid().optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  thumbnail_source: z.enum(['auto', 'manual', 'none']).default('none'),
});

export const updateLinkSchema = createLinkSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
});

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
  category_id: z.string().uuid().optional().nullable(),
  parent_folder_id: z.string().uuid().optional().nullable(),
});

export const moveFolderSchema = z.object({
  folder_id: z.string().uuid(),
  new_parent_folder_id: z.string().uuid().optional().nullable(),
  new_category_id: z.string().uuid().optional().nullable(),
});

export const sendLinkSchema = z.object({
  url: z.string().min(1, 'URL or text is required'),
  title: z.string().max(500).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  recipient_ids: z.array(z.string().uuid()).min(1, 'Select at least one recipient'),
  source_link_id: z.string().uuid().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
});

export const bulkMoveSchema = z.object({
  link_ids: z.array(z.string().uuid()).min(1),
  category_id: z.string().uuid().optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
});

export const bulkDeleteSchema = z.object({
  link_ids: z.array(z.string().uuid()).min(1),
});

export const acceptSuggestionSchema = z.object({
  send_recipient_id: z.string().uuid(),
  title: z.string().max(500).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
  reading_status: readingStatusSchema.optional(),
});
