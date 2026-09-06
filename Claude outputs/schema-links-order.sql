-- Run this once in Supabase -> SQL Editor -> New query -> Run.
-- Lets Admin arrange Useful Links in a chosen order (important links or
-- updates first) instead of always showing oldest-first.

ALTER TABLE IF EXISTS useful_links ADD COLUMN IF NOT EXISTS sort_order integer;

-- Give existing links a starting order based on when they were added.
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM useful_links
)
UPDATE useful_links
SET sort_order = ordered.rn
FROM ordered
WHERE useful_links.id = ordered.id
  AND useful_links.sort_order IS NULL;
