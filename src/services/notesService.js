import { supabaseClient } from '../config/supabase';

// A private running note each Senior Manager, Manager, or Planner keeps
// for themselves - one row per user, created the first time they save.
// Nobody else can read or write another user's note.
export const notesService = {
  async getMyNote(userId) {
    const { data, error } = await supabaseClient
      .from('user_notes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data; // null if this user has never saved a note yet
  },

  async saveNote(userId, content) {
    const { data, error } = await supabaseClient
      .from('user_notes')
      .upsert({ user_id: userId, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
