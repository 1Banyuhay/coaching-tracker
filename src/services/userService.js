import { supabaseClient } from '../config/supabase';
import { hashPassword } from '../utils/passwordHash';

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

  // Managers who report to a specific Senior Manager.
  async getManagersForSeniorManager(seniorManagerId) {
    const { data, error } = await supabaseClient
      .from('coaching_users')
      .select('id, username, full_name, role, branch, status')
      .eq('role', 'manager')
      .eq('reports_to_id', seniorManagerId)
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Planners two hops down from a Senior Manager: every planner whose
  // manager reports to this Senior Manager. This is the scope for
  // "coach a planner directly" and for the Senior Manager's dashboard -
  // a Senior Manager should only ever see their own branch's people.
  async getPlannersForSeniorManager(seniorManagerId) {
    const managers = await this.getManagersForSeniorManager(seniorManagerId);
    const managerIds = managers.map((m) => m.id);
    if (managerIds.length === 0) return [];

    const { data, error } = await supabaseClient
      .from('coaching_users')
      .select('id, username, full_name, role, branch, status, reports_to_id')
      .eq('role', 'planner')
      .in('reports_to_id', managerIds);

    if (error) throw error;
    return data || [];
  },

  // Creates a new user with a random temporary password. Returns the
  // created row plus the plaintext temp password (shown once so the
  // Senior Manager can relay it - it is not recoverable after this call).
  async createUser({ fullName, username, role, branch, reportsToId }) {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const { data, error } = await supabaseClient
      .from('coaching_users')
      .insert({
        username,
        full_name: fullName,
        role,
        // coaching_users.branch is NOT NULL - an empty string (not null)
        // for "no branch set" (e.g. Admin accounts).
        branch: branch || '',
        reports_to_id: reportsToId || null,
        status: 'active',
        password: passwordHash,
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
    const passwordHash = await hashPassword(tempPassword);

    const { error } = await supabaseClient
      .from('coaching_users')
      .update({ password: passwordHash, password_reset_required: true })
      .eq('id', userId);

    if (error) throw error;
    return tempPassword;
  },

  // A logged-in user setting their own new password (clears the
  // must-change flag so they aren't prompted again).
  async changeOwnPassword(userId, newPassword) {
    const passwordHash = await hashPassword(newPassword);

    const { error } = await supabaseClient
      .from('coaching_users')
      .update({ password: passwordHash, password_reset_required: false })
      .eq('id', userId);

    if (error) throw error;
    return passwordHash;
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

  // Changes an existing person's role - the "promote a planner to manager"
  // (or move a manager back to planner) case that comes up on real
  // promotions, without having to delete and recreate the account and lose
  // their coaching history. 'planner' and 'manager' are grantable by a
  // Senior Manager; 'senior_manager' is only ever offered in the UI to an
  // Admin (Admin sits above Senior Manager, so only Admin hands that role
  // out or takes it back).
  //
  // Promoting someone to manager sets their reports_to_id to the acting
  // Senior Manager/Admin (the same rule new managers get on creation - a
  // Senior Manager only ever manages their own branch, so there's no one
  // else to pick). Any other role change clears reports_to_id - a planner
  // reassigns to a new manager like normal, and a Senior Manager has no
  // manager-side reporting line at all.
  async updateRole(userId, newRole, actingManagerOrSeniorManagerId) {
    if (!['planner', 'manager', 'senior_manager'].includes(newRole)) {
      throw new Error('Role can only be changed to planner, manager, or senior manager here');
    }
    const updates = { role: newRole };
    updates.reports_to_id = newRole === 'manager' ? actingManagerOrSeniorManagerId : null;

    const { error } = await supabaseClient
      .from('coaching_users')
      .update(updates)
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
