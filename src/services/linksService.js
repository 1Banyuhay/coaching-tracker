import { supabaseClient } from '../config/supabase';

// "Useful Links" - a small shared list (URL + description) that shows up as
// its own tab on every dashboard. Only an Admin account can add, edit,
// remove, or reorder entries; every other role sees a read-only list, in
// the order Admin arranged, that opens links in a new tab.
export const linksService = {
  async getLinks() {
    const { data, error } = await supabaseClient
      .from('useful_links')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createLink({ title, url, description, createdBy }) {
    // New links go to the bottom of the list by default.
    const { data: existing, error: fetchError } = await supabaseClient
      .from('useful_links')
      .select('sort_order')
      .order('sort_order', { ascending: false, nullsFirst: false })
      .limit(1);
    if (fetchError) throw fetchError;
    const nextOrder = existing && existing.length && existing[0].sort_order != null
      ? existing[0].sort_order + 1
      : 1;

    const { data, error } = await supabaseClient
      .from('useful_links')
      .insert({
        title,
        url,
        description: description || null,
        created_by: createdBy || null,
        sort_order: nextOrder,
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

  // Swaps the sort_order of two links (used by the admin's up/down move
  // buttons) so both persist in one round trip's worth of calls.
  async swapOrder(linkA, linkB) {
    const orderA = linkA.sort_order ?? 0;
    const orderB = linkB.sort_order ?? 0;
    await Promise.all([
      this.updateLink(linkA.id, { sort_order: orderB }),
      this.updateLink(linkB.id, { sort_order: orderA }),
    ]);
  },
};
