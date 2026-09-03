-- Planner Coaching & Development Tracker
-- Supabase PostgreSQL Schema with RLS Policies

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'senior_manager', 'manager', 'planner');

CREATE TYPE competency_level AS ENUM ('1_needs_guidance', '2_familiar', '3_can_perform_independently', '4_can_demonstrate_coach');

CREATE TYPE validation_method AS ENUM ('discussion', 'knowledge_check', 'role_play', 'demonstration', 'client_observation', 'case_simulation', 'output_review', 'other');

CREATE TYPE action_item_status AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled');

CREATE TYPE coaching_session_status AS ENUM ('draft', 'awaiting_planner_confirmation', 'confirmed', 'cancelled');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'planner',
  branch_id UUID,
  reports_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_reports_to ON profiles(reports_to_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_branch_id ON profiles(branch_id);

-- Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update branch_id foreign key
ALTER TABLE profiles 
ADD CONSTRAINT fk_branch_id FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- Coaching Categories (e.g., Product Familiarity, FNA/FBB, etc.)
CREATE TABLE coaching_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coaching Topics (nested under categories)
CREATE TABLE coaching_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES coaching_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_topic_name_per_category ON coaching_topics(category_id, name);
CREATE INDEX idx_coaching_topics_category_id ON coaching_topics(category_id);

-- Coaching Items (granular coaching points under topics)
CREATE TABLE coaching_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES coaching_topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_item_name_per_topic ON coaching_items(topic_id, name);
CREATE INDEX idx_coaching_items_topic_id ON coaching_items(topic_id);

-- Coaching Sessions
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  planner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  coaching_date DATE NOT NULL,
  status coaching_session_status DEFAULT 'draft',
  observations TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_coaching_sessions_manager_id ON coaching_sessions(manager_id);
CREATE INDEX idx_coaching_sessions_planner_id ON coaching_sessions(planner_id);
CREATE INDEX idx_coaching_sessions_coaching_date ON coaching_sessions(coaching_date);
CREATE INDEX idx_coaching_sessions_status ON coaching_sessions(status);

-- Coaching Assessments (rating for each item discussed)
CREATE TABLE coaching_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  coaching_item_id UUID NOT NULL REFERENCES coaching_items(id) ON DELETE RESTRICT,
  competency_rating competency_level NOT NULL,
  validation_method validation_method,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_assessment_session_item ON coaching_assessments(coaching_session_id, coaching_item_id);
CREATE INDEX idx_coaching_assessments_coaching_session_id ON coaching_assessments(coaching_session_id);
CREATE INDEX idx_coaching_assessments_coaching_item_id ON coaching_assessments(coaching_item_id);

-- Action Items
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  assigned_to_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  due_date DATE NOT NULL,
  status action_item_status DEFAULT 'not_started',
  completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_action_items_coaching_session_id ON action_items(coaching_session_id);
CREATE INDEX idx_action_items_assigned_to_id ON action_items(assigned_to_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_due_date ON action_items(due_date);

-- Planner Confirmations
CREATE TABLE planner_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_session_id UUID NOT NULL UNIQUE REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  planner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  planner_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_planner_confirmations_planner_id ON planner_confirmations(planner_id);
CREATE INDEX idx_planner_confirmations_coaching_session_id ON planner_confirmations(coaching_session_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_confirmations ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin'::user_role
$$ LANGUAGE SQL STABLE;

-- Helper function to get all user IDs under a person's reporting hierarchy
CREATE OR REPLACE FUNCTION get_reporting_hierarchy(start_user_id UUID)
RETURNS TABLE(user_id UUID) AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT id FROM profiles WHERE id = start_user_id
    UNION ALL
    SELECT p.id FROM profiles p
    INNER JOIN hierarchy h ON p.reports_to_id = h.user_id
  )
  SELECT user_id FROM hierarchy
$$ LANGUAGE SQL STABLE;

-- PROFILES RLS
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Managers can view their reporting hierarchy"
  ON profiles FOR SELECT
  USING (
    is_admin() OR
    auth.uid() = id OR
    id IN (SELECT * FROM get_reporting_hierarchy(auth.uid()))
  );

CREATE POLICY "Only admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- BRANCHES RLS
CREATE POLICY "Everyone can view branches"
  ON branches FOR SELECT
  USING (TRUE);

CREATE POLICY "Only admins can manage branches"
  ON branches FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update branches"
  ON branches FOR UPDATE
  USING (is_admin());

-- COACHING CATEGORIES RLS
CREATE POLICY "Everyone can view non-archived categories"
  ON coaching_categories FOR SELECT
  USING (TRUE);

CREATE POLICY "Only admins can manage categories"
  ON coaching_categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update categories"
  ON coaching_categories FOR UPDATE
  USING (is_admin());

-- COACHING TOPICS RLS
CREATE POLICY "Everyone can view non-archived topics"
  ON coaching_topics FOR SELECT
  USING (TRUE);

CREATE POLICY "Only admins can manage topics"
  ON coaching_topics FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update topics"
  ON coaching_topics FOR UPDATE
  USING (is_admin());

-- COACHING ITEMS RLS
CREATE POLICY "Everyone can view non-archived items"
  ON coaching_items FOR SELECT
  USING (TRUE);

CREATE POLICY "Only admins can manage items"
  ON coaching_items FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update items"
  ON coaching_items FOR UPDATE
  USING (is_admin());

-- COACHING SESSIONS RLS
CREATE POLICY "Managers can view their own coaching sessions"
  ON coaching_sessions FOR SELECT
  USING (
    auth.uid() = manager_id OR
    auth.uid() = planner_id OR
    is_admin()
  );

CREATE POLICY "Managers can create coaching sessions with their planners"
  ON coaching_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = manager_id AND
    planner_id IN (SELECT * FROM get_reporting_hierarchy(auth.uid()))
  );

CREATE POLICY "Managers can update their own coaching sessions"
  ON coaching_sessions FOR UPDATE
  USING (auth.uid() = manager_id OR is_admin());

-- COACHING ASSESSMENTS RLS
CREATE POLICY "Users can view assessments for their coaching sessions"
  ON coaching_assessments FOR SELECT
  USING (
    coaching_session_id IN (
      SELECT id FROM coaching_sessions 
      WHERE manager_id = auth.uid() OR planner_id = auth.uid()
    ) OR
    is_admin()
  );

CREATE POLICY "Managers can create assessments in their sessions"
  ON coaching_assessments FOR INSERT
  WITH CHECK (
    coaching_session_id IN (
      SELECT id FROM coaching_sessions WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update assessments in their sessions"
  ON coaching_assessments FOR UPDATE
  USING (
    coaching_session_id IN (
      SELECT id FROM coaching_sessions WHERE manager_id = auth.uid()
    ) OR
    is_admin()
  );

-- ACTION ITEMS RLS
CREATE POLICY "Users can view action items for their coaching sessions"
  ON action_items FOR SELECT
  USING (
    coaching_session_id IN (
      SELECT id FROM coaching_sessions 
      WHERE manager_id = auth.uid() OR planner_id = auth.uid()
    ) OR
    assigned_to_id = auth.uid() OR
    is_admin()
  );

CREATE POLICY "Managers can create action items"
  ON action_items FOR INSERT
  WITH CHECK (
    coaching_session_id IN (
      SELECT id FROM coaching_sessions WHERE manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers and assignees can update action items"
  ON action_items FOR UPDATE
  USING (
    coaching_session_id IN (
      SELECT id FROM coaching_sessions WHERE manager_id = auth.uid()
    ) OR
    assigned_to_id = auth.uid() OR
    is_admin()
  );

-- PLANNER CONFIRMATIONS RLS
CREATE POLICY "Planners can view their own confirmations"
  ON planner_confirmations FOR SELECT
  USING (
    planner_id = auth.uid() OR
    coaching_session_id IN (
      SELECT id FROM coaching_sessions WHERE manager_id = auth.uid()
    ) OR
    is_admin()
  );

CREATE POLICY "Planners can confirm coaching"
  ON planner_confirmations FOR INSERT
  WITH CHECK (
    planner_id = auth.uid() AND
    coaching_session_id IN (
      SELECT id FROM coaching_sessions 
      WHERE planner_id = auth.uid() AND status = 'awaiting_planner_confirmation'
    )
  );

-- ============================================
-- SEED DATA (Initial Coaching Library)
-- ============================================

INSERT INTO coaching_categories (name, description, display_order) VALUES
('Product Familiarity', 'Knowledge of products, positioning, and how to present them', 1),
('FNA / FBB', 'Financial Needs Analysis and Financial Building Blocks methodology', 2),
('Client Conversation', 'Communication skills and client interaction techniques', 3),
('Tools', 'Use of systems, platforms, and calculators', 4),
('New Business', 'Prospecting, sales process, and closing', 5),
('After Sales / Servicing', 'Client retention, policy servicing, and follow-up', 6),
('Compliance', 'Regulatory requirements and compliance practices', 7),
('Business Activity', 'Daily activities, time management, and productivity', 8);

-- Product Familiarity Topics
INSERT INTO coaching_topics (category_id, name, display_order) 
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('Product Positioning'),
    ('Ideal Client'),
    ('Key Benefits'),
    ('Coverage Options'),
    ('Riders and Enhancements'),
    ('Premium and Payment Options'),
    ('Eligibility Requirements'),
    ('Exclusions and Limitations'),
    ('How to Present'),
    ('Common Client Questions')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'Product Familiarity' LIMIT 1) cat;

-- FNA / FBB Topics
INSERT INTO coaching_topics (category_id, name, display_order)
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('Preliminary Questions'),
    ('Client Profile'),
    ('Financial Priorities'),
    ('Existing Coverage'),
    ('Family Situation'),
    ('Cash Flow Analysis'),
    ('Income Assessment'),
    ('Expense Management'),
    ('Emergency Fund Planning'),
    ('Protection Needs Assessment'),
    ('Life Insurance Needs'),
    ('Critical Illness Coverage'),
    ('Disability Coverage'),
    ('Medical / Hospitalization'),
    ('Wealth Goals'),
    ('Retirement Planning'),
    ('Education Planning'),
    ('Estate Planning'),
    ('Investment Strategy'),
    ('Debt Management'),
    ('Policy Review'),
    ('FBB Presentation'),
    ('Building Analogy'),
    ('Explaining Financial Building Blocks'),
    ('Identifying Priority'),
    ('Transition to Recommendation')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'FNA / FBB' LIMIT 1) cat;

-- Client Conversation Topics
INSERT INTO coaching_topics (category_id, name, display_order)
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('Active Listening'),
    ('Open-Ended Questions'),
    ('Needs Discovery'),
    ('Objection Handling'),
    ('Building Rapport'),
    ('Closing Techniques'),
    ('Follow-up Communication')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'Client Conversation' LIMIT 1) cat;

-- Tools Topics
INSERT INTO coaching_topics (category_id, name, display_order)
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('CRM Usage'),
    ('Calculator Tools'),
    ('Proposal Software'),
    ('Document Management'),
    ('Client Tracking')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'Tools' LIMIT 1) cat;

-- New Business Topics
INSERT INTO coaching_topics (category_id, name, display_order)
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('Prospecting Techniques'),
    ('Lead Generation'),
    ('Sales Process'),
    ('Presentation Skills'),
    ('Closing Process'),
    ('Pipeline Management')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'New Business' LIMIT 1) cat;

-- After Sales / Servicing Topics
INSERT INTO coaching_topics (category_id, name, display_order)
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('Policy Review Scheduling'),
    ('Policy Servicing Process'),
    ('Claims Assistance'),
    ('Client Retention'),
    ('Renewal Process')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'After Sales / Servicing' LIMIT 1) cat;

-- Compliance Topics
INSERT INTO coaching_topics (category_id, name, display_order)
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('Regulatory Requirements'),
    ('Documentation Standards'),
    ('Client Suitability'),
    ('Disclosure Requirements')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'Compliance' LIMIT 1) cat;

-- Business Activity Topics
INSERT INTO coaching_topics (category_id, name, display_order)
SELECT id, name, row_number() OVER (ORDER BY id) FROM (
  SELECT * FROM (VALUES
    ('Daily Planning'),
    ('Activity Tracking'),
    ('Goal Setting'),
    ('Time Management'),
    ('Client Relationship Management')
  ) AS t(name)
) t, (SELECT id FROM coaching_categories WHERE name = 'Business Activity' LIMIT 1) cat;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_coaching_sessions_manager_planner ON coaching_sessions(manager_id, planner_id);
CREATE INDEX idx_coaching_sessions_planner_coaching_date ON coaching_sessions(planner_id, coaching_date);
CREATE INDEX idx_coaching_sessions_manager_coaching_date ON coaching_sessions(manager_id, coaching_date);
CREATE INDEX idx_action_items_assigned_to_due_date ON action_items(assigned_to_id, due_date);
