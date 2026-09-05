import { supabaseClient } from '../config/supabase';

// "Useful Links" - a small shared list (URL + description) that shows up as
// its own tab on every dashboard. Only an Admin account can add, edit or
// remove entries; every other role sees a read-only list that opens links
// in a new tab.
export const linksService = {
  async getLinks() {
    const { data, error } = await supabaseClient
      .from('useful_links')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createLink({ title, url, description, createdBy }) {
    const { data, error } = await supabaseClient
      .from('useful_links')
      .insert({
        title,
        url,
        description: description || null,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateLink(id, fields) {
    const { error } = await supabaseClient
      .from('useful_links')
      .update(fields)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteLink(id) {
    const { error } = await supabaseClient
      .from('useful_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
