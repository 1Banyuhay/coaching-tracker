import { supabaseClient } from '../config/supabase';

export const dashboardService = {
  // Admin: See everything
  async getAdminDashboard() {
    try {
      const { data: seniors, error: sError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('role', 'senior_manager');

      const { data: managers, error: mError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('role', 'manager');

      const { data: planners, error: pError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('role', 'planner');

      const { data: sessions, error: sessError } = await supabaseClient
        .from('coaching_sessions')
        .select('*');

      return {
        seniors: seniors || [],
        managers: managers || [],
        planners: planners || [],
        sessions: sessions || [],
        stats: {
          totalSeniorManagers: seniors?.length || 0,
          totalManagers: managers?.length || 0,
          totalPlanners: planners?.length || 0,
          totalSessions: sessions?.length || 0
        }
      };
    } catch (err) {
      console.error('Admin dashboard error:', err);
      return { seniors: [], managers: [], planners: [], sessions: [], stats: {} };
    }
  },

  // Senior Manager: See their managers and planners
  async getSeniorManagerDashboard(userId) {
    try {
      // Get managers reporting to this senior manager
      const { data: managers } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('reports_to_id', userId)
        .eq('role', 'manager');

      const managerIds = managers?.map(m => m.id) || [];

      // Get planners reporting to those managers
      const { data: planners } = await supabaseClient
        .from('profiles')
        .select('*')
        .in('reports_to_id', managerIds);

      // Get coaching sessions for those managers
      const { data: sessions } = await supabaseClient
        .from('coaching_sessions')
        .select('*')
        .in('manager_id', managerIds);

      return {
        managers: managers || [],
        planners: planners || [],
        sessions: sessions || [],
        stats: {
          totalManagers: managers?.length || 0,
          totalPlanners: planners?.length || 0,
          totalSessions: sessions?.length || 0
        }
      };
    } catch (err) {
      console.error('Senior manager dashboard error:', err);
      return { managers: [], planners: [], sessions: [], stats: {} };
    }
  },

  // Manager: See their planners
  async getManagerDashboard(userId) {
    try {
      const { data: planners } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('reports_to_id', userId)
        .eq('role', 'planner');

      const plannerIds = planners?.map(p => p.id) || [];

      const { data: sessions } = await supabaseClient
        .from('coaching_sessions')
        .select('*')
        .eq('manager_id', userId);

      return {
        planners: planners || [],
        sessions: sessions || [],
        stats: {
          totalPlanners: planners?.length || 0,
          totalSessions: sessions?.length || 0,
          plannersCoached: new Set(sessions?.map(s => s.planner_id)).size || 0
        }
      };
    } catch (err) {
      console.error('Manager dashboard error:', err);
      return { planners: [], sessions: [], stats: {} };
    }
  },

  // Planner: See their coaching sessions
  async getPlannerDashboard(userId) {
    try {
      const { data: sessions } = await supabaseClient
        .from('coaching_sessions')
        .select('*')
        .eq('planner_id', userId);

      return {
        sessions: sessions || [],
        stats: {
          totalSessions: sessions?.length || 0,
          pendingSessions: sessions?.filter(s => s.status === 'pending').length || 0
        }
      };
    } catch (err) {
      console.error('Planner dashboard error:', err);
      return { sessions: [], stats: {} };
    }
  }
};
