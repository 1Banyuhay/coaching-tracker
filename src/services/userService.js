import { supabase } from './supabaseClient';

export const userService = {
  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get all planners for a manager
  getManagerPlanners: async (managerId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('reports_to_id', managerId)
        .eq('role', 'planner')
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get planner details with coaching stats
  getPlannerProfile: async (plannerId, managerId = null) => {
    try {
      // Get planner profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', plannerId)
        .single();

      if (profileError) throw profileError;

      // Get coaching stats for current month
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const { data: monthCoachingSessions } = await supabase
        .from('coaching_sessions')
        .select('id')
        .eq('planner_id', plannerId)
        .gte('coaching_date', monthStart.toISOString().split('T')[0])
        .lte('coaching_date', monthEnd.toISOString().split('T')[0]);

      // Get YTD coaching sessions
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const { data: ytdCoachingSessions } = await supabase
        .from('coaching_sessions')
        .select('id')
        .eq('planner_id', plannerId)
        .gte('coaching_date', yearStart.toISOString().split('T')[0]);

      // Get pending confirmations
      const { data: pendingConfirmations } = await supabase
        .from('coaching_sessions')
        .select('id')
        .eq('planner_id', plannerId)
        .eq('status', 'awaiting_planner_confirmation');

      // Get follow-ups due
      const { data: followUpsDue } = await supabase
        .from('coaching_sessions')
        .select('id')
        .eq('planner_id', plannerId)
        .eq('follow_up_required', true)
        .lte('follow_up_date', today.toISOString().split('T')[0])
        .neq('status', 'cancelled');

      // Get current action items
      const { data: actionItems } = await supabase
        .from('action_items')
        .select(`
          *,
          coaching_session:coaching_session_id(planner_id)
        `)
        .eq('coaching_session.planner_id', plannerId)
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      return {
        data: {
          ...profile,
          stats: {
            coachingThisMonth: monthCoachingSessions?.length || 0,
            coachingYTD: ytdCoachingSessions?.length || 0,
            pendingConfirmations: pendingConfirmations?.length || 0,
            followUpsDue: followUpsDue?.length || 0,
            activeActionItems: actionItems?.length || 0,
          },
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get last coaching date for planner
  getLastCoachingDate: async (plannerId) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('coaching_date')
        .eq('planner_id', plannerId)
        .neq('status', 'cancelled')
        .order('coaching_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return { data: data?.coaching_date || null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get latest competency ratings for planner
  getLatestCompetencies: async (plannerId, limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('coaching_assessments')
        .select(`
          *,
          coaching_item:coaching_item_id(
            *,
            topic:topic_id(
              *,
              category:category_id(*)
            )
          ),
          coaching_session:coaching_session_id(coaching_date)
        `)
        .eq('coaching_session.planner_id', plannerId)
        .order('coaching_session(coaching_date)', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Check if user can access planner (authorization)
  canAccessPlanner: async (userId, plannerId) => {
    try {
      // Get user's role
      const { data: user } = await userService.getUserProfile(userId);
      if (!user) return { canAccess: false, error: 'User not found' };

      // Admin can access anyone
      if (user.role === 'admin') return { canAccess: true, error: null };

      // Planner can only access themselves
      if (user.role === 'planner') {
        return { canAccess: userId === plannerId, error: null };
      }

      // Manager can access their assigned planners
      if (user.role === 'manager') {
        const { data: planner } = await userService.getUserProfile(plannerId);
        return { canAccess: planner?.reports_to_id === userId, error: null };
      }

      return { canAccess: false, error: 'Insufficient permissions' };
    } catch (error) {
      return { canAccess: false, error };
    }
  },
};
