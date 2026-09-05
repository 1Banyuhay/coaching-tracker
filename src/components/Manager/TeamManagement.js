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

  const loadUsers = useCallback(async () => {
    try {
      const list = await userService.getAllUsers();
      setUsers(list);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load your organization’s users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const managers = users.filter((u) => u.role === 'manager');
  const usersById = new Map(users.map((u) => [u.id, u]));

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
        branch: form.branch.trim(),
        reportsToId: form.reportsToId || null,
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

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    setBusyUserId(targetUser.id);
    try {
      await userService.setStatus(targetUser.id, nextStatus);
      toast.success(`${targetUser.full_name} is now ${nextStatus}`);
      loadUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDelete = async (targetUser) => {
    if (!window.confirm(`Permanently delete ${targetUser.full_name}? This cannot be undone.`)) return;
    setBusyUserId(targetUser.id);
    try {
      await userService.deleteUser(targetUser.id);
      toast.success(`${targetUser.full_name} deleted`);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleReassign = async (targetUser, newManagerId) => {
    setBusyUserId(targetUser.id);
    try {
      await userService.assignManager(targetUser.id, newManagerId || null);
      toast.success(`${targetUser.full_name}’s manager updated`);
      loadUsers();
    } catch (error) {
      console.error('Error assigning manager:', error);
      toast.error('Failed to update manager');
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
          <h1 className="header-title">MANAGE TEAM</h1>
        </div>
        <div className="header-date">{users.length} user{users.length !== 1 ? 's' : ''} in your organization</div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="section-title">ALL USERS</h2>
          <button type="button" className="cta-button" style={{ marginTop: 0 }} onClick={() => setShowAddForm(true)}>
            + ADD PERSON
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Reports To</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.full_name}</strong></td>
                <td>{u.username}</td>
                <td>{ROLE_LABELS[u.role] || u.role}</td>
                <td>{u.branch || '—'}</td>
                <td>
                  {u.role === 'planner' ? (
                    <select
                      className="filter-select"
                      value={u.reports_to_id || ''}
                      onChange={(e) => handleReassign(u, e.target.value ? parseInt(e.target.value, 10) : null)}
                      disabled={busyUserId === u.id}
                    >
                      <option value="">Unassigned</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    usersById.get(u.reports_to_id)?.full_name || '—'
                  )}
                </td>
                <td>
                  <span className={`status-badge ${u.status === 'active' ? 'status-acknowledged' : 'status-pending'}`}>
                    {u.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="team-actions">
                  <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleResetPassword(u)}>
                    Reset Password
                  </button>
                  <button className="action-btn" disabled={busyUserId === u.id} onClick={() => handleToggleStatus(u)}>
                    {u.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  {u.id !== user?.id && (
                    <button className="action-btn action-btn-danger" disabled={busyUserId === u.id} onClick={() => handleDelete(u)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="summary-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>Add Person</h2>
              <button className="summary-modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <form className="summary-modal-body team-form" onSubmit={handleAddUser}>
              <label className="field-label">Full Name</label>
              <input className="form-control" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

              <label className="field-label">Username</label>
              <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. juan.delacruz" />

              <label className="field-label">Role</label>
              <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, reportsToId: '' })}>
                <option value="planner">Planner</option>
                <option value="manager">Manager</option>
                <option value="senior_manager">Senior Manager</option>
              </select>

              <label className="field-label">Branch</label>
              <input className="form-control" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g. Bagani" />

              {form.role === 'planner' && (
                <>
                  <label className="field-label">Reports to (Manager)</label>
                  <select className="form-control" value={form.reportsToId} onChange={(e) => setForm({ ...form, reportsToId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </>
              )}

              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create Account'}</button>
              </div>
            </form>
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
