# Planner Coaching & Development Tracker

A professional web-based coaching tracker for insurance agencies to manage, assess, and monitor financial planner development.

## Features 

- **Role-Based Access**: Admin, Senior Manager, Manager, and Planner roles
- **Coaching Cycle Management**: OBSERVE → DISCUSS → ASSESS → COACH → AGREE ON ACTION → FOLLOW UP → CONFIRM
- **Competency Tracking**: 4-level rating system (Needs Guidance to Demonstrate/Coach Others)
- **Coaching Library**: Admin-managed, hierarchical library of coaching categories, topics, and items
- **Action Item Tracking**: Assign, track, and complete action items
- **Planner Confirmation**: Planners confirm coaching sessions and provide feedback
- **Manager Dashboard**: Real-time coaching activity metrics and analytics
- **Immutable Audit Trail**: All coaching records are permanent and historical
- **Mobile-Responsive**: Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React 18, React Router, HTML/CSS/JavaScript
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Netlify
- **UI Components**: Lucide React Icons

## Project Structure

```
src/
├── components/
│   ├── Auth/               # Login form
│   ├── Layout/             # Navbar, Sidebar, Protected routes
│   ├── Manager/            # Manager dashboards and forms
│   ├── Planner/            # Planner views and confirmations
│   ├── Admin/              # Admin dashboards and library management
│   └── Common/             # Shared components
├── services/
│   ├── supabaseClient.js   # Supabase initialization
│   ├── authService.js      # Authentication logic
│   ├── coachingService.js  # Coaching operations
│   └── userService.js      # User management
├── hooks/
│   └── useAuth.js          # Auth state management
├── utils/
│   └── dateHelpers.js      # Date utilities
└── styles/
    ├── global.css          # Global styles
    └── App.css             # App-specific styles
```

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repo-url>
cd coaching-tracker
npm install
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select existing one
3. Go to **SQL Editor** → **New Query**
4. Copy the contents of `coaching-tracker-schema.sql` and run it
5. Go to **Project Settings** → **API** to get:
   - Project URL
   - Anon Key

### 3. Environment Variables

Create `.env.local` in the project root:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

## Deployment to Netlify

### 1. Connect Git Repository

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Select your repository

### 2. Set Environment Variables

In Netlify:
1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Add:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

### 3. Deploy

Netlify automatically deploys on every push to main branch.

## Initial Setup & Testing

### Create Test Users

In Supabase **SQL Editor**, run:

```sql
-- Create Admin User
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin@1sang.com',
  'Admin',
  'User',
  'admin',
  true
);

-- Create Manager User
INSERT INTO profiles (id, email, first_name, last_name, role, reports_to_id, is_active)
SELECT gen_random_uuid(), 'manager@1sang.com', 'Manager', 'One', 'manager', id, true
FROM profiles WHERE email = 'admin@1sang.com' LIMIT 1;

-- Create Planner Users
INSERT INTO profiles (id, email, first_name, last_name, role, reports_to_id, is_active)
SELECT gen_random_uuid(), 'planner1@1sang.com', 'John', 'Planner', 'planner', id, true
FROM profiles WHERE email = 'manager@1sang.com' LIMIT 1;

INSERT INTO profiles (id, email, first_name, last_name, role, reports_to_id, is_active)
SELECT gen_random_uuid(), 'planner2@1sang.com', 'Jane', 'Planner', 'planner', id, true
FROM profiles WHERE email = 'manager@1sang.com' LIMIT 1;
```

### Create Auth Users

1. Go to Supabase **Authentication** → **Users**
2. Click **Invite user** for each test email
3. Users will receive invitation links

## Database Schema

### Core Tables

- **profiles**: User accounts with roles and reporting hierarchy
- **coaching_sessions**: Individual coaching events
- **coaching_assessments**: Competency ratings for specific coaching items
- **action_items**: Tasks assigned during coaching
- **planner_confirmations**: Planner acknowledgments of coaching
- **coaching_categories**: Coaching library categories (Product Familiarity, FNA/FBB, etc.)
- **coaching_topics**: Topics within categories
- **coaching_items**: Specific coaching points within topics

### Security

All data access is controlled by Row Level Security (RLS) policies:
- Planners can only view their own records
- Managers can view their assigned planners and coaching records
- Admins can view everything

## Features Roadmap

### Phase 1 (MVP)
- ✅ Manager coaching form workflow
- ✅ Planner confirmation view
- ✅ Coaching history
- ✅ Manager dashboard (today/week/month filters)
- ✅ Coaching library browser
- ✅ Action item tracking

### Phase 2
- [ ] Senior Manager aggregated dashboards
- [ ] Advanced reporting and exports
- [ ] Competency gap analysis
- [ ] Coaching frequency analytics
- [ ] Follow-up workflow notifications
- [ ] Team coaching activity heatmaps

### Phase 3
- [ ] Mobile app (React Native)
- [ ] SMS reminders for follow-ups
- [ ] Integration with CRM systems
- [ ] Coaching templates and quick-starts
- [ ] Performance benchmarking

## Support & Documentation

For questions or issues:
1. Check the [requirements document](./README.md)
2. Review the schema comments in `coaching-tracker-schema.sql`
3. Check component props and function signatures

## License

Internal use only - 1Sang Banyuhay Financial Group
