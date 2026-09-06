import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';
import './ManagerDashboard.css';
import './TeamManagement.css';

const ROLE_LABELS = {
  senior_manager: 'Senior Manager',
  manager: 'Manager',
  planner: 'Planner',
  admin: 'Admin',
};

const emptyForm = { fullName: '', username: '', role: 'planner', branch: '', reportsToId: '' };

const TeamManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState(null); // { name, tempPassword }
  const [busyUserId, setBusyUserId] = useState(null);
  // Staged edits for the two actions that used to apply the instant a
  // control was touched (the reassignment dropdowns, and the
  // Activate/Deactivate toggle) - now held here until reviewed and
  // confirmed, so an accidental click or a wrong dropdown pick doesn't
  // silently take effect. Keyed by `${userId}_${field}` so a user can have
  // both a staged reassignment and a staged status change at once.
  const [pendingChanges, setPendingChanges] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [applyingChanges, setApplyingChanges] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadUsers = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Admin sees everyone; a Senior Manager only ever sees their own
      // branch - the managers reporting to them and those managers'
      // planners. Never other Senior Managers, never Admin.
      const list = isAdmin ? await userService.getAllUsers() : await userService.getBranchTeam(user.id);
      setUsers(list);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load your team');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const managers = users.filter((u) => u.role === 'manager');
  const seniorManagers = users.filter((u) => u.role === 'senior_manager');
  const usersById = new Map(users.map((u) => [u.id, u]));
  // So a manager row's "reports to" can resolve to the viewing Senior
  // Manager's own name even though they don't appear as a row themselves.
  if (user) usersById.set(user.id, user);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.username.trim()) {
      toast.error('Name and username are required');
      return;
    }

    setSaving(true);
    try {
      const { user: created, tempPassword } = await userService.createUser({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        role: form.role,
        // Admin types the branch in by hand (needed when creating a new
        // Senior Manager, who defines a new branch). A Senior Manager has
        // no branch field at all - everyone they add is automatically in
        // their own branch.
        branch: isAdmin ? form.branch.trim() : (user?.branch || ''),
        // Planners: whichever manager was picked below (or unassigned).
        // Managers: report to the Senior Manager creating them - unless
        // it's an Admin doing the creating, in which case they picked one
        // below (Admin manages every branch, so there's no single "you"
        // to default to). Senior Managers/Admins: no manager-side line.
        reportsToId:
          form.role === 'planner'
            ? (form.reportsToId || null)
            : form.role === 'manager'
            ? (isAdmin ? (form.reportsToId || null) : user.id)
            : null,
      });
      toast.success(`${created.full_name} added`);
      setRevealedPassword({ name: created.full_name, username: created.username, tempPassword });
      setForm(emptyForm);
      setShowAddForm(false);
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (targetUser) => {
    if (!window.confirm(`Generate a new temporary password for ${targetUser.full_name}?`)) return;
    setBusyUserId(targetUser.id);
    try {
      const tempPassword = await userService.resetPassword(targetUser.id);
      setRevealedPassword({ name: targetUser.full_name, username: targetUser.username, tempPassword });
      loadUsers();
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setBusyUserId(null);
    }
  };

  // Stages a reassignment or status change instead of applying it right
  // away. Re-staging the value the record already has (e.g. flipping the
  // status toggle twice) clears the staged edit rather than piling up a
  // no-op change.
  const stageChange = (targetUser, field, value) => {
    const key = `${targetUser.id}_${field}`;
    const actualValue = field === 'manager' ? (targetUser.reports_to_id || null) : targetUser.status;
    setPendingChanges((prev) => {
      const next = { ...prev };
      if (value === actualValue) {
        delete next[key];
      } else {
        next[key] = { targetUser, field, value };
      }
      return next;
    });
  };

  const effectiveReportsTo = (u) => {
    const staged = pendingChanges[`${u.id}_manager`];
    return staged ? (staged.value ?? '') : (u.reports_to_id || '');
  };

  const effectiveStatus = (u) => {
    const staged = pendingChanges[`${u.id}_status`];
    return staged ? staged.value : u.status;
  };

  const describeChange = (change) => {
    if (change.field === 'status') {
      return change.value === 'active' ? 'Reactivate' : 'Deactivate';
    }
    const toName = change.value ? (usersById.get(change.value)?.full_name || 'someone no longer listed') : 'Unassigned';
    return `Reassign to ${toName}`;
  };

  const discardPendingChanges = () => {
    setPendingChanges({});
    setShowReviewModal(false);
  };

  const applyPendingChanges = async () => {
    const changes = Object.values(pendingChanges);
    if (changes.length === 0) return;
    setApplyingChanges(true);
    try {
      for (const change of changes) {
        if (change.field === 'manager') {
          await userService.assignManager(change.targetUser.id, change.value);
        } else if (change.field === 'status') {
          await userService.setStatus(change.targetUser.id, change.value);
        }
      }
      toast.success(`${changes.length} change${changes.length !== 1 ? 's' : ''} applied`);
    } catch (error) {
      console.error('Error applying changes:', error);
      toast.error('Some changes may not have applied - reloading current state');
    } finally {
      setPendingChanges({});
      setShowReviewModal(false);
      setApplyingChanges(false);
      loadUsers();
    }
  };

  const handleToggleStatus = (targetUser) => {
    const nextStatus = effectiveStatus(targetUser) === 'active' ? 'inactive' : 'active';
    stageChange(targetUser, 'status', nextStatus);
  };

  // Saves a JSON copy of someone's coaching history to the browser's
  // downloads before it's gone for good - the "wipe it, but keep a copy"
  // safety net for deleting a planner with real history attached.
  const downloadRecordsBackup = (targetUser, records) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      planner: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.full_name,
        branch: targetUser.branch,
      },
      coachingRecords: records,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${targetUser.username}-coaching-records-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (targetUser) => {
    // Deleting a Planner is allowed to wipe their coaching history - but
    // only after a backup of it has been downloaded to this browser, so
    // the record still exists somewhere even once it's gone from the
    // system. Manager/Senior Manager/Admin accounts keep the stricter
    // behavior (blocked while they have history - deactivate instead).
    const isPlanner = targetUser.role === 'planner';
    const confirmMsg = isPlanner
      ? `Permanently delete ${targetUser.full_name}? Their coaching records (if any) will be downloaded to your computer first as a backup, then wiped from the system. This cannot be undone.`
      : `Permanently delete ${targetUser.full_name}? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setBusyUserId(targetUser.id);
    try {
      if (isPlanner) {
        const records = await userService.getCoachingRecordsForUser(targetUser.id);
        if (records.length > 0) {
          downloadRecordsBackup(targetUser, records);
        }
        await userService.deleteUser(targetUser.id, { force: true });
      } else {
        await userService.deleteUser(targetUser.id);
      }
      toast.success(`${targetUser.full_name} deleted`);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleReassign = (targetUser, newManagerId) => {
    stageChange(targetUser, 'manager', newManagerId || null);
  };

  // Promotions happen - a planner becomes a manager (and can then have
  // planners assigned under them), or a manager moves back to planner.
  const handleChangeRole = async (targetUser, newRole) => {
    const verb = newRole === 'planner' ? 'move' : 'promote';
    const confirmMsg =
      newRole === 'manager'
        ? `Promote ${targetUser.full_name} to Manager? They'll report to you and can have planners assigned to them.`
        : newRole === 'senior_manager'
        ? `Promote ${targetUser.full_name} to Senior Manager? They'll manage their own branch and can add or promote people under them.`
        : `Move ${targetUser.full_name} back to Planner? They'll be unassigned from any manager reporting line.`;
    if (!window.confirm(confirmMsg)) return;

    setBusyUserId(targetUser.id);
    try {
      // Only auto-assign "reports to me" when a Senior Manager promotes one
      // of their own planners to manager - unambiguous, since they only
      // manage their own branch. When Admin does a role change (promoting
      // to manager, promoting to Senior Manager, or demoting a Senior
      // Manager back to manager), leave the reporting line unassigned -
      // Admin can then pick the right Senior Manager from the table.
      const actingId = !isAdmin && newRole === 'manager' ? user.id : null;
      await userService.updateRole(targetUser.id, newRole, actingId);
      const roleLabel = newRole === 'manager' ? 'now a Manager' : newRole === 'senior_manager' ? 'now a Senior Manager' : 'now a Planner';
      toast.success(`${targetUser.full_name} is ${roleLabel}`);
      loadUsers();
    } catch (error) {
      console.error(`Error trying to ${verb} user:`, error);
      toast.error('Failed to update role');
    } finally {
      setBusyUserId(null);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(revealedPassword.tempPassword);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy automatically - select and copy manually');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <p className="header-subtitle">1Sang Banyuhay Financial Group</p>
          <h1 className="header-title">MANAGE TEAM</h1>
        </div>
        <div className="header-date">{users.length} user{users.length !== 1 ? 's' : ''} in your {isAdmin ? 'organization' : 'branch'}</div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="section-title">ALL USERS</h2>
          <button type="button" className="cta-button" style={{ marginTop: 0 }} onClick={() => setShowAddForm(true)}>
            {isAdmin ? '+ ADD PERSON' : '+ ADD PLANNER'}
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Branch</th>
              <th>{isAdmin ? 'Reports To' : 'Manager'}</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const hasPendingChange = !!(pendingChanges[`${u.id}_manager`] || pendingChanges[`${u.id}_status`]);
              return (
              <tr key={u.id} style={hasPendingChange ? { background: '#fff8e6' } : undefined}>
                <td><strong>{u.full_name}</strong></td>
                <td>{u.username}</td>
                <td>{ROLE_LABELS[u.role] || u.role}</td>
                <td>{u.branch || '—'}</td>
                <td>
                  {u.role === 'planner' ? (
                    <select
                      className="filter-select"
                      value={effectiveReportsTo(u)}
                      onChange={(e) => handleReassign(u, e.target.value ? parseInt(e.target.value, 10) : null)}
                      disabled={busyUserId === u.id}
                    >
                      <option value="">Unassigned</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  ) : u.role === 'manager' && isAdmin ? (
                    <select
                      className="filter-select"
                      value={effectiveReportsTo(u)}
                      onChange={(e) => handleReassign(u, e.target.value ? parseInt(e.target.value, 10) : null)}
                      disabled={busyUserId === u.id}
                    >
                      <option value="">Unassigned</option>
                      {seniorManagers.map((sm) => (
                        <option key={sm.id} value={sm.id}>{sm.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    usersById.get(u.reports_to_id)?.full_name || '—'
                  )}
                </td>
                <td>
                  <span className={`status-badge ${effectiveStatus(u) === 'active' ? 'status-acknowledged' : 'status-pending'}`}>
                    {effectiveStatus(u) === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  {pendingChanges[`${u.id}_status`] && <div className="info-text" style={{ marginTop: '0.25rem' }}>Pending review</div>}
                </td>
                <td className="team-actions">
                  {u.role === 'planner' && (
                    <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleChangeRole(u, 'manager')}>
                      Promote to Manager
                    </button>
                  )}
                  {u.role === 'manager' && (
                    <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleChangeRole(u, 'planner')}>
                      Move to Planner
                    </button>
                  )}
                  {isAdmin && (u.role === 'planner' || u.role === 'manager') && (
                    <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleChangeRole(u, 'senior_manager')}>
                      Promote to Senior Manager
                    </button>
                  )}
                  {isAdmin && u.role === 'senior_manager' && (
                    <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleChangeRole(u, 'manager')}>
                      Move to Manager
                    </button>
                  )}
                  <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleResetPassword(u)}>
                    Reset Password
                  </button>
                  <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleToggleStatus(u)}>
                    {effectiveStatus(u) === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  {u.id !== user?.id && (
                    <button className="action-btn action-btn-danger" disabled={busyUserId === u.id} onClick={() => handleDelete(u)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {Object.keys(pendingChanges).length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn-secondary" onClick={discardPendingChanges}>
              Discard Changes
            </button>
            <button type="button" className="cta-button" style={{ marginTop: 0 }} onClick={() => setShowReviewModal(true)}>
              Review {Object.keys(pendingChanges).length} Change{Object.keys(pendingChanges).length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="summary-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>{isAdmin ? 'Add Person' : 'Add Planner'}</h2>
              <button className="summary-modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <form className="summary-modal-body team-form" onSubmit={handleAddUser}>
              <label className="field-label">Full Name</label>
              <input className="form-control" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

              <label className="field-label">Username</label>
              <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. juan.delacruz" />

              {isAdmin && (
                <>
                  <label className="field-label">Role</label>
                  <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, reportsToId: '' })}>
                    <option value="planner">Planner</option>
                    <option value="manager">Manager</option>
                    <option value="senior_manager">Senior Manager</option>
                  </select>

                  <label className="field-label">Branch</label>
                  <input className="form-control" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g. Bagani" />
                </>
              )}

              {form.role === 'planner' && (
                <>
                  <label className="field-label">Manager</label>
                  <select className="form-control" value={form.reportsToId} onChange={(e) => setForm({ ...form, reportsToId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </>
              )}

              {form.role === 'manager' && (
                isAdmin ? (
                  <>
                    <label className="field-label">Reports to (Senior Manager)</label>
                    <select className="form-control" value={form.reportsToId} onChange={(e) => setForm({ ...form, reportsToId: e.target.value })}>
                      <option value="">Unassigned</option>
                      {seniorManagers.map((sm) => (
                        <option key={sm.id} value={sm.id}>{sm.full_name}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <div className="info-text" style={{ marginTop: '1rem' }}>
                    Will report to you ({user?.full_name}).
                  </div>
                )
              )}

              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="summary-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>Review Changes</h2>
              <button className="summary-modal-close" onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div className="summary-modal-body">
              <p className="info-text" style={{ marginBottom: '1rem' }}>
                Nothing has been saved yet. Confirm to apply these changes, or go back and keep editing.
              </p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(pendingChanges).map((change) => (
                    <tr key={`${change.targetUser.id}_${change.field}`}>
                      <td><strong>{change.targetUser.full_name}</strong></td>
                      <td>{describeChange(change)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)} disabled={applyingChanges}>
                  Keep Editing
                </button>
                <button type="button" className="btn-primary" onClick={applyPendingChanges} disabled={applyingChanges}>
                  {applyingChanges ? 'Applying...' : 'Confirm & Apply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {revealedPassword && (
        <div className="summary-modal-overlay" onClick={() => setRevealedPassword(null)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>Temporary Password</h2>
              <button className="summary-modal-close" onClick={() => setRevealedPassword(null)}>×</button>
            </div>
            <div className="summary-modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Share this with <strong>{revealedPassword.name}</strong> (username <strong>{revealedPassword.username}</strong>).
                They will be asked to set their own password the first time they log in. This won&apos;t be shown again.
              </p>
              <div className="temp-password-box">
                <code>{revealedPassword.tempPassword}</code>
                <button type="button" className="action-btn" onClick={copyPassword}>Copy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
