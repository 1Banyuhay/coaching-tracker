import React, { useState, useEffect, useCallback } from 'react';
import { topicsService } from '../../../services/topicsService';
import toast from 'react-hot-toast';
import '../../Manager/ManagerDashboard.css';
import '../../Manager/TeamManagement.css';

// Which recipient a topic applies to - i.e. who is being coached in the
// session, not who's doing the coaching. Coaching a Planner (whether by a
// Manager or a Senior Manager) is one case; a Senior Manager coaching a
// Manager directly is the other, and usually calls for different,
// leadership/management-focused topics.
const ROLE_OPTIONS = [
  { value: 'planner', label: 'Planner' },
  { value: 'manager', label: 'Manager' },
];
const ROLE_LABELS = { planner: 'Planner', manager: 'Manager' };

const visibilityLabel = (roles) => {
  if (!roles || roles.length === 0) return 'Hidden from everyone (draft)';
  if (roles.length === ROLE_OPTIONS.length) return 'Coaching a Planner or a Manager';
  return roles.map((r) => `Coaching a ${ROLE_LABELS[r] || r}`).join(', ');
};

const emptyForm = { name: '', visibleRoles: ['planner'] };

// Admin-only: the list of topics available in the "Coaching Focus Area"
// step of a coaching log, and whether each one shows up when the person
// being coached is a Planner, a Manager, or both. Manager and Senior
// Manager only ever read this list (via topicsService.getTopicsForRole,
// keyed by recipient type) - they never see this page.
const LibraryBrowser = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadTopics = useCallback(async () => {
    try {
      const list = await topicsService.getAllTopics();
      setTopics(list);
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const openForCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openForEdit = (topic) => {
    setForm({
      name: topic.name,
      visibleRoles: topic.visible_roles && topic.visible_roles.length ? [...topic.visible_roles] : [],
    });
    setEditingId(topic.id);
    setShowForm(true);
  };

  const toggleRole = (roleValue) => {
    setForm((f) => ({
      ...f,
      visibleRoles: f.visibleRoles.includes(roleValue)
        ? f.visibleRoles.filter((r) => r !== roleValue)
        : [...f.visibleRoles, roleValue],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Topic name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await topicsService.updateTopic(editingId, { name: form.name.trim(), visible_roles: form.visibleRoles });
        toast.success('Topic updated');
      } else {
        await topicsService.createTopic({ name: form.name, visibleRoles: form.visibleRoles });
        toast.success('Topic added');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      loadTopics();
    } catch (error) {
      console.error('Error saving topic:', error);
      toast.error(error.message || 'Failed to save topic');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (topic) => {
    if (!window.confirm(`Remove "${topic.name}"? Coaching logs that already used this topic keep it - it just won't be pickable for new ones.`)) return;
    setBusyId(topic.id);
    try {
      await topicsService.deleteTopic(topic.id);
      toast.success('Topic removed');
      loadTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast.error('Failed to remove topic');
    } finally {
      setBusyId(null);
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
          <h1 className="header-title">COACHING TOPICS</h1>
        </div>
        <button type="button" className="cta-button" style={{ marginTop: 0 }} onClick={openForCreate}>
          + ADD TOPIC
        </button>
      </div>

      <div className="card">
        <p className="info-text" style={{ marginBottom: '1.25rem' }}>
          These are the choices Managers and Senior Managers see under "Coaching Focus Area" when logging a
          session. Pick whether each topic should show up when coaching a Planner, a Manager, or both -
          leadership/management topics typically apply to Manager sessions, while product and sales topics
          apply to Planner sessions.
        </p>

        {topics.length === 0 ? (
          <div className="no-data">No topics yet - add the first one.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Shown When Coaching</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <td><strong>{topic.name}</strong></td>
                  <td>{visibilityLabel(topic.visible_roles)}</td>
                  <td className="team-actions">
                    <button type="button" className="action-btn" onClick={() => openForEdit(topic)}>Edit</button>
                    <button
                      type="button"
                      className="action-btn action-btn-danger"
                      disabled={busyId === topic.id}
                      onClick={() => handleDelete(topic)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="summary-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>{editingId ? 'Edit Topic' : 'Add Topic'}</h2>
              <button className="summary-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="summary-modal-body team-form" onSubmit={handleSave}>
              <label className="field-label">Topic Name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Objection-Handling"
              />

              <label className="field-label">Shown when coaching a</label>
              <div className="role-checkbox-group">
                {ROLE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="role-checkbox">
                    <input
                      type="checkbox"
                      checked={form.visibleRoles.includes(opt.value)}
                      onChange={() => toggleRole(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              {form.visibleRoles.length === 0 && (
                <div className="info-text" style={{ marginTop: '0.5rem' }}>
                  No roles selected - this topic will be saved but won&apos;t show up for anyone yet.
                </div>
              )}

              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryBrowser;
