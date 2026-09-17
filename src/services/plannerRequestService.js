import { supabaseClient } from '../config/supabase';
import { hashPassword } from '../utils/passwordHash';
import { generateTempPassword } from './userService';

// Backs the "Add Planner" request flow: a Manager submits a name +
// username, their Senior Manager reviews it, and only a confirm actually
// creates the coaching_users account. See schema-planner-requests.sql for
// the table this reads/writes.
export const plannerRequestService = {
  // Manager submits a request - goes to their Senior Manager for review.
  async requestPlanner({ requestedBy, fullName, username, branch }) {
    const { data, error } = await supabaseClient
      .from('planner_requests')
      .insert({
        requested_by: requestedBy,
        full_name: fullName,
        username,
        branch: branch || '',
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Every request a Manager has made, newest first - powers their
  // "Pending Requests" list on My Planners, including ones that have
  // already resolved so the history (and any rejection reason) isn't
  // lost the moment it's no longer actionable.
  async getRequestsForManager(managerId) {
    const { data, error } = await supabaseClient
      .from('planner_requests')
      .select('*')
      .eq('requested_by', managerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Pending requests from every manager reporting to this Senior Manager -
  // powers the Manage Team review panel and its notification banner.
  async getPendingRequestsForManagers(managerIds) {
    if (!managerIds || managerIds.length === 0) return [];
    const { data, error } = await supabaseClient
      .from('planner_requests')
      .select('*')
      .eq('status', 'pending')
      .in('requested_by', managerIds)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Confirms a request: creates the real coaching_users account (mirrors
  // userService.createUser) and generates its temp password, then marks
  // the request confirmed and stashes that password for the Manager's
  // one-time reveal. A taken username throws a clear error instead of
  // silently confirming nothing - the request stays pending so it can be
  // rejected (asking for a different username) or retried once fixed.
  async confirmRequest(request, resolvedBy) {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const { data: newUser, error: insertError } = await supabaseClient
      .from('coaching_users')
      .insert({
        username: request.username,
        full_name: request.full_name,
        role: 'planner',
        branch: request.branch || '',
        reports_to_id: request.requested_by,
        status: 'active',
        password: passwordHash,
        password_reset_required: true,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error(`Username "${request.username}" is already taken - reject this request so the manager can resubmit with a different username.`);
      }
      throw insertError;
    }

    const { error: updateError } = await supabaseClient
      .from('planner_requests')
      .update({
        status: 'confirmed',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        created_user_id: newUser.id,
        temp_password: tempPassword,
      })
      .eq('id', request.id);

    if (updateError) {
      // The account itself was created successfully - only the request
      // record failed to update. Surface this distinctly so it doesn't
      // read as "nothing happened" when an account actually exists now.
      throw new Error(`${request.full_name}'s account was created, but the request couldn't be marked confirmed. Check Manage Team - the account exists even though this request may still show pending.`);
    }

    return { user: newUser, tempPassword };
  },

  async rejectRequest(requestId, resolvedBy, reason) {
    const { error } = await supabaseClient
      .from('planner_requests')
      .update({
        status: 'rejected',
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        reject_reason: reason || null,
      })
      .eq('id', requestId);
    if (error) throw error;
  },

  // Clears the one-time temp password once the Manager has seen it -
  // "shown once, then gone", same spirit as the direct Add-Planner flow's
  // reveal never being retrievable again after that screen is closed.
  async acknowledgeTempPassword(requestId) {
    const { error } = await supabaseClient
      .from('planner_requests')
      .update({ temp_password: null })
      .eq('id', requestId);
    if (error) throw error;
  },
};
