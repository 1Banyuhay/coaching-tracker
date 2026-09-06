import { supabaseClient } from '../config/supabase';

// The list of topics a Manager or Senior Manager can pick from in the
// "Coaching Focus Area" step of a coaching log - previously a hardcoded
// list baked into the form itself. Now Admin-managed, with per-role
// visibility (a topic can be shown to Manager, Senior Manager, or both).

export const topicsService = {
  // Every topic regardless of visibility - for Admin's management page.
  async getAllTopics() {
    const { data, error } = await supabaseClient
      .from('session_topics')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Only the topics a given role (manager/senior_manager) is allowed to
  // see when logging a coaching session.
  async getTopicsForRole(role) {
    const { data, error } = await supabaseClient
      .from('session_topics')
      .select('*')
      .contains('visible_roles', [role])
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createTopic({ name, visibleRoles }) {
    const { data, error } = await supabaseClient
      .from('session_topics')
      .insert({ name: name.trim(), visible_roles: visibleRoles })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`"${name}" already exists`);
      }
      throw error;
    }
    return data;
  },

  async updateTopic(id, fields) {
    const { error } = await supabaseClient.from('session_topics').update(fields).eq('id', id);
    if (error) {
      if (error.code === '23505') {
        throw new Error('A topic with that name already exists');
      }
      throw error;
    }
  },

  async deleteTopic(id) {
    const { error } = await supabaseClient.from('session_topics').delete().eq('id', id);
    if (error) throw error;
  },
};
