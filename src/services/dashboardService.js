import { supabaseClient } from '../config/supabase';

export const dashboardService = {
  async getManagerDashboard(userId) {
    try {
      const { data: records } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('coach_id', userId);

      return {
        stats: {
          totalPlanners: 0,
          plannersCoached: records?.length || 0,
          pendingSessions: records?.filter(r => r.status === 'pending').length || 0,
          acknowledgedSessions: records?.filter(r => r.status === 'acknowledged').length || 0,
          completedSessions: records?.filter(r => r.status === 'coaching_complete').length || 0,
        },
        sessions: records || [],
        planners: [],
        managerCoachingSessions: []
      };
    } catch (error) {
      console.error('Error fetching manager dashboard:', error);
      return { stats: {}, sessions: [], planners: [], managerCoachingSessions: [] };
    }
  },

  async getSeniorManagerDashboard(userId) {
    try {
      const { data: records } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('coach_id', userId);

      return {
        stats: {
          totalPlanners: 0,
          plannersCoached: records?.length || 0,
          pendingSessions: records?.filter(r => r.status === 'pending').length || 0,
          acknowledgedSessions: records?.filter(r => r.status === 'acknowledged').length || 0,
          completedSessions: records?.filter(r => r.status === 'coaching_complete').length || 0,
        },
        sessions: records || [],
        planners: []
      };
    } catch (error) {
      console.error('Error fetching senior manager dashboard:', error);
      return { stats: {}, sessions: [], planners: [] };
    }
  },

  async getPlannerDashboard(userId) {
    try {
      const { data: records } = await supabaseClient
        .from('coaching_records')
        .select('*')
        .eq('planner_id', userId);

      return {
        stats: {
          pendingRecords: records?.filter(r => r.status === 'pending').length || 0,
          acknowledgedRecords: records?.filter(r => r.status === 'acknowledged').length || 0,
          completedRecords: records?.filter(r => r.status === 'coaching_complete').length || 0,
          totalThisMonth: records?.length || 0,
        },
        records: records || []
      };
    } catch (error) {
      console.error('Error fetching planner dashboard:', error);
      return { stats: {}, records: [] };
    }
  }
};
