-- Run this once in Supabase → SQL Editor → New query → Run.
-- Fixes "Failed to save link" / "new row violates row-level security
-- policy" errors on Useful Links, and the same issue on Coaching Topics.
--
-- What happened: Supabase now turns Row Level Security ON by default for
-- new tables, even ones created via the SQL Editor. This app doesn't use
-- Supabase's own login system at all - it has its own username/password
-- table (coaching_users) and checks access in the app itself - so every
-- other table has RLS switched off. These two newer tables were the only
-- ones left with it still on, which blocks every write with no policy to
-- allow it. This makes them consistent with the rest of the app.

ALTER TABLE IF EXISTS useful_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS session_topics DISABLE ROW LEVEL SECURITY;
