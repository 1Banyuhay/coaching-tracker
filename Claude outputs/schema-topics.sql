-- Run this once in Supabase → SQL Editor → New query → Run.
-- Adds the "Coaching Topics" feature: Admin can add/edit topics and choose
-- whether each one is available to Manager, Senior Manager, or both, when
-- logging a coaching session. Seeds it with the topics already in use
-- today so nothing disappears from the dropdown after this runs.

CREATE TABLE IF NOT EXISTS session_topics (
  id bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  visible_roles text[] NOT NULL DEFAULT '{manager,senior_manager}',
  created_at timestamptz DEFAULT now()
);

INSERT INTO session_topics (name) VALUES
  ('Riders'), ('Smart Start'), ('Manifest'), ('Fast Lane'), ('Wealth+'),
  ('Set for Health'), ('Future Sure'), ('The One'), ('Branding'),
  ('Prospecting'), ('Appointment Setting'), ('Objection-Handling'),
  ('Closing'), ('Cube App'), ('Omne App'), ('FNA FBB App'),
  ('Financial Building Blocks'), ('Policy Review'),
  ('Investment Discussion'), ('Debt Management'), ('Incentives'),
  ('Compensation'), ('Promotion')
ON CONFLICT (name) DO NOTHING;
