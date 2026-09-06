import { supabaseClient } from '../config/supabase';

// "Terminologies" - a shared glossary Admin manages (term + explanation),
// shown as its own link right above Useful Links. Every role sees a
// read-only list and clicks a term to reveal its explanation; only an
// Admin account can add, edit, remove terms, or pick which roles see one.
export const termsService = {
  async getAllTerms() {
    const { data, error } = await supabaseClient
      .from('glossary_terms')
      .select('*')
      .order('term', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createTerm({ term, explanation, visibleRoles }) {
    const { data, error } = await supabaseClient
      .from('glossary_terms')
      .insert({ term: term.trim(), explanation: explanation || null, visible_roles: visibleRoles })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`"${term}" already exists`);
      }
      throw error;
    }
    return data;
  },

  async updateTerm(id, fields) {
    const { error } = await supabaseClient.from('glossary_terms').update(fields).eq('id', id);
    if (error) {
      if (error.code === '23505') {
        throw new Error('A term with that name already exists');
      }
      throw error;
    }
  },

  async deleteTerm(id) {
    const { error } = await supabaseClient.from('glossary_terms').delete().eq('id', id);
    if (error) throw error;
  },
};
