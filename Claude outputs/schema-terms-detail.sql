-- Run this once in Supabase → SQL Editor → New query → Run.
-- Extends the Terminologies glossary to hold a category, a separate
-- worked Example alongside the Definition, so a term's detail view can
-- show Definition and Example as two distinct sections.

ALTER TABLE IF EXISTS glossary_terms RENAME COLUMN explanation TO definition;
ALTER TABLE IF EXISTS glossary_terms ADD COLUMN IF NOT EXISTS example text;
ALTER TABLE IF EXISTS glossary_terms ADD COLUMN IF NOT EXISTS category text;
