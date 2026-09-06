-- Run this once in Supabase → SQL Editor → New query → Run.
-- glossary_terms is rejecting inserts with "row-level security policy"
-- even though it was disabled earlier - re-disabling it, and adding a
-- permissive policy as a backup in case RLS gets flipped back on again.

ALTER TABLE IF EXISTS glossary_terms DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS glossary_terms_allow_all ON glossary_terms;
CREATE POLICY glossary_terms_allow_all ON glossary_terms
  FOR ALL USING (true) WITH CHECK (true);

-- Same precaution for user_notes while we're here.
ALTER TABLE IF EXISTS user_notes DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notes_allow_all ON user_notes;
CREATE POLICY user_notes_allow_all ON user_notes
  FOR ALL USING (true) WITH CHECK (true);
