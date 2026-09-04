import { supabaseClient } from '../config/supabase';

export const dashboardService = {
  async getManagerDashboard(userId) {
    try {
      const { data: planners } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('reports_to_id', userId);

      const { data: sessions } = await supabaseClient
        .from('coaching_sessions')
        .select('*')
        .eq('manager_id', userId);

      const { data: managerCoachingSessions } = await supabaseClient
        .from('coaching_sessions')
        .select('*')
        .eq('planner_id', userId);

      const { data: currentUserData } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      return {
        planners,
        sessions,
        managerCoachingSessions,
        currentUser: currentUserData,
        stats: {
          totalPlanners: planners?.length || 0,
          plannersCoached: sessions?.length || 0,
        },
      };
    } catch (err) {
      console.error('Manager dashboard error:', err);
      return { planners: [], sessions: [], managerCoachingSessions: [], stats: { totalPlanners: 0, plannersCoached: 0 } };
    }
  },

  async getPlannerDashboard(plannerId) {
    try {
      const { data: pendingSessions } = await supabaseClient
        .from('coaching_sessions')
        .select(`id, topic, coaching_date, competency_level, status, discussion_notes, manager:profiles!coaching_sessions_manager_id_fkey(first_name, last_name), follow_up_required, follow_up_date`)
        .eq('planner_id', plannerId)
        .eq('status', 'pending')
        .order('coaching_date', { ascending: false });

      const { data: coachingHistory } = await supabaseClient
        .from('coaching_sessions')
        .select(`id, topic, coaching_date, competency_level, status, planner_acknowledgment_date, planner_acknowledgment_notes, follow_up_date, manager:profiles!coaching_sessions_manager_id_fkey(first_name, last_name)`)
        .eq('planner_id', plannerId)
        .eq('status', 'acknowledged')
        .order('coaching_date', { ascending: false });

      const { data: actionItems } = await supabaseClient
        .from('action_items')
        .select(`id, description, due_date, status, session_id`)
        .eq('assigned_to_id', plannerId)
        .order('due_date', { ascending: true });

      return {
        pendingSessions: pendingSessions || [],
        coachingHistory: coachingHistory || [],
        actionItems: actionItems || [],
      };
    } catch (error) {
      console.error('Error fetching planner dashboard:', error);
      return {
        pendingSessions: [],
        coachingHistory: [],
        actionItems: [],
      };
    }
  },
};
