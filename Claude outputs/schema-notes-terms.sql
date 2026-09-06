-- Run this once in Supabase → SQL Editor → New query → Run.
-- Adds two new features:
--   1) Notes - a private running note each Senior Manager, Manager, or
--      Planner can write, edit, and save for themselves. Nobody else can
--      see or edit someone else's note.
--   2) Terminologies - a shared glossary shown as its own link right
--      above Useful Links. Admin adds/edits terms and their explanations
--      later; everyone else clicks a term to see its explanation.

CREATE TABLE IF NOT EXISTS user_notes (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL UNIQUE REFERENCES coaching_users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS user_notes DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS glossary_terms (
  id bigserial PRIMARY KEY,
  term text NOT NULL UNIQUE,
  explanation text,
  visible_roles text[] NOT NULL DEFAULT '{planner,manager,senior_manager}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS glossary_terms DISABLE ROW LEVEL SECURITY;
