-- Migration: 20260909000001_remove_tags.sql
-- Description: Completely remove the tags feature and link_tags join table from Linkiac.

-- 1. Drop link_tags join table and cascading dependencies/constraints
drop table if exists public.link_tags cascade;

-- 2. Drop tags table and cascading dependencies/constraints
drop table if exists public.tags cascade;
