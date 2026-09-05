import { supabaseClient } from '../config/supabase';

// Characters chosen to avoid visual mix-ups when someone hand-types a temp
// password off a screen (no 0/O, no 1/I/l).
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 10) {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)];
  }
  return out;
}

export const userService = {
  // All users (for the Senior Manager's team management list).
  async getAllUsers() {
    const { data, error } = await supabaseClient
      .from('coaching_users')
      .select('id, username, full_name, role, branch, status, reports_to_id, password_reset_required, created_at')
      .order('role', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Planners assigned to a specific manager (reports_to_id = managerId).
  async getTeamRoster(managerId) {
    const { data, error } = await supabaseClient
      .from('coaching_users')
      .select('id, username, full_name, role, branch, status')
      .eq('role', 'planner')
      .eq('reports_to_id', managerId);

    if (error) throw error;
    return data || [];
  },

  async getAllPlanners() {
    const { data, error } = await supabaseClient
      .from('coaching_users')
      .select('id, username, full_name, role, branch, status, reports_to_id')
      .eq('role', 'planner')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAllManagers() {
    const { data, error } = await supabaseClient
      .from('coaching_users')
      .select('id, username, full_name, role, branch, status')
      .eq('role', 'manager')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Creates a new user with a random temporary password. Returns the
  // created row plus the plaintext temp password (shown once so the
  // Senior Manager can relay it - it is not recoverable after this call).
  async createUser({ fullName, username, role, branch, reportsToId }) {
    const tempPassword = generateTempPassword();

    const { data, error } = await supabaseClient
      .from('coaching_users')
      .insert({
        username,
        full_name: fullName,
        role,
        branch: branch || null,
        reports_to_id: reportsToId || null,
        status: 'active',
        password: tempPassword,
        password_reset_required: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Username "${username}" is already taken`);
      }
      throw error;
    }

    return { user: data, tempPassword };
  },

  // Generates and sets a new temporary password for an existing user.
  async resetPassword(userId) {
    const tempPassword = generateTempPassword();

    const { error } = await supabaseClient
      .from('coaching_users')
      .update({ password: tempPassword, password_reset_required: true })
      .eq('id', userId);

    if (error) throw error;
    return tempPassword;
  },

  // A logged-in user setting their own new password (clears the
  // must-change flag so they aren't prompted again).
  async changeOwnPassword(userId, newPassword) {
    const { error } = await supabaseClient
      .from('coaching_users')
      .update({ password: newPassword, password_reset_required: false })
      .eq('id', userId);

    if (error) throw error;
  },

  async setStatus(userId, status) {
    const { error } = await supabaseClient
      .from('coaching_users')
      .update({ status })
      .eq('id', userId);

    if (error) throw error;
  },

  async assignManager(userId, reportsToId) {
    const { error } = await supabaseClient
      .from('coaching_users')
      .update({ reports_to_id: reportsToId || null })
      .eq('id', userId);

    if (error) throw error;
  },

  // Hard delete only makes sense for a user with no coaching history -
  // deleting someone with coaching_records would either fail or destroy
  // real organizational history. Callers should offer "deactivate"
  // instead when this throws.
  async deleteUser(userId) {
    const { count: coachCount } = await supabaseClient
      .from('coaching_records')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', userId);
    const { count: plannerCount } = await supabaseClient
      .from('coaching_records')
      .select('id', { count: 'exact', head: true })
      .eq('planner_id', userId);

    if ((coachCount || 0) > 0 || (plannerCount || 0) > 0) {
      throw new Error(
        'This person has coaching history attached to their account. Deactivate them instead of deleting, so that history is preserved.'
      );
    }

    const { error } = await supabaseClient.from('coaching_users').delete().eq('id', userId);
    if (error) throw error;
  },
};
