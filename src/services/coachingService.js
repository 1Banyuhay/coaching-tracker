import { supabase } from './supabaseClient';

export const coachingService = {
  // ============================================
  // COACHING SESSIONS
  // ============================================

  // Create a new coaching session (draft)
  createCoachingSession: async (managerId, plannerId, coachingDate) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .insert({
          manager_id: managerId,
          planner_id: plannerId,
          coaching_date: coachingDate,
          status: 'draft',
        })
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get coaching session by ID
  getCoachingSession: async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get coaching sessions for manager
  getManagerCoachingSessions: async (managerId, startDate = null, endDate = null) => {
    try {
      let query = supabase
        .from('coaching_sessions')
        .select(`
          *,
          planner:planner_id(id, first_name, last_name, email),
          coaching_assessments(*)
        `)
        .eq('manager_id', managerId)
        .order('coaching_date', { ascending: false });

      if (startDate && endDate) {
        query = query
          .gte('coaching_date', startDate)
          .lte('coaching_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get coaching sessions for planner
  getPlannerCoachingHistory: async (plannerId) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select(`
          *,
          manager:manager_id(id, first_name, last_name),
          coaching_assessments(
            *,
            coaching_item:coaching_item_id(*)
          ),
          action_items(*),
          planner_confirmations(*)
        `)
        .eq('planner_id', plannerId)
        .neq('status', 'cancelled')
        .order('coaching_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Submit coaching session (change status to awaiting_planner_confirmation)
  submitCoachingSession: async (sessionId, observations, followUpRequired, followUpDate) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .update({
          observations,
          follow_up_required: followUpRequired,
          follow_up_date: followUpDate,
          status: 'awaiting_planner_confirmation',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // ============================================
  // COACHING ASSESSMENTS
  // ============================================

  // Add assessment for a coaching item
  addAssessment: async (sessionId, itemId, competencyRating, validationMethod, notes) => {
    try {
      const { data, error } = await supabase
        .from('coaching_assessments')
        .insert({
          coaching_session_id: sessionId,
          coaching_item_id: itemId,
          competency_rating: competencyRating,
          validation_method: validationMethod,
          notes,
        })
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update assessment
  updateAssessment: async (assessmentId, competencyRating, validationMethod, notes) => {
    try {
      const { data, error } = await supabase
        .from('coaching_assessments')
        .update({
          competency_rating: competencyRating,
          validation_method: validationMethod,
          notes,
        })
        .eq('id', assessmentId)
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get assessments for a session
  getSessionAssessments: async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('coaching_assessments')
        .select(`
          *,
          coaching_item:coaching_item_id(
            *,
            topic:topic_id(*)
          )
        `)
        .eq('coaching_session_id', sessionId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // ============================================
  // ACTION ITEMS
  // ============================================

  // Add action item
  addActionItem: async (sessionId, action, assignedToId, dueDate) => {
    try {
      const { data, error } = await supabase
        .from('action_items')
        .insert({
          coaching_session_id: sessionId,
          action,
          assigned_to_id: assignedToId,
          due_date: dueDate,
          status: 'not_started',
        })
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update action item status
  updateActionItemStatus: async (actionItemId, status, completionDate = null) => {
    try {
      const { data, error } = await supabase
        .from('action_items')
        .update({
          status,
          completion_date: status === 'completed' ? completionDate || new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', actionItemId)
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get action items for a session
  getSessionActionItems: async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('action_items')
        .select('*')
        .eq('coaching_session_id', sessionId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // ============================================
  // PLANNER CONFIRMATIONS
  // ============================================

  // Get pending confirmations for planner
  getPendingConfirmations: async (plannerId) => {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select(`
          *,
          manager:manager_id(id, first_name, last_name),
          coaching_assessments(
            *,
            coaching_item:coaching_item_id(*)
          ),
          action_items(*)
        `)
        .eq('planner_id', plannerId)
        .eq('status', 'awaiting_planner_confirmation')
        .order('coaching_date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Confirm coaching session
  confirmCoachingSession: async (sessionId, plannerId, comment = null) => {
    try {
      // Update session status
      const { error: updateError } = await supabase
        .from('coaching_sessions')
        .update({ status: 'confirmed' })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Create confirmation record
      const { data, error } = await supabase
        .from('planner_confirmations')
        .insert({
          coaching_session_id: sessionId,
          planner_id: plannerId,
          confirmed_at: new Date().toISOString(),
          planner_comment: comment,
        })
        .select();

      if (error) throw error;
      return { data: data[0], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // ============================================
  // COACHING LIBRARY
  // ============================================

  // Get all categories
  getCoachingCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('coaching_categories')
        .select('*')
        .eq('is_archived', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get topics for a category
  getCategoryTopics: async (categoryId) => {
    try {
      const { data, error } = await supabase
        .from('coaching_topics')
        .select('*')
        .eq('category_id', categoryId)
        .eq('is_archived', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get items for a topic
  getTopicItems: async (topicId) => {
    try {
      const { data, error } = await supabase
        .from('coaching_items')
        .select('*')
        .eq('topic_id', topicId)
        .eq('is_archived', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get full library structure
  getFullLibrary: async () => {
    try {
      const { data, error } = await supabase
        .from('coaching_categories')
        .select(`
          *,
          coaching_topics(
            *,
            coaching_items(*)
          )
        `)
        .eq('is_archived', false)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
