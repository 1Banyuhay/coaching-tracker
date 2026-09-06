import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { linksService } from '../../services/linksService';
import toast from 'react-hot-toast';
import { ExternalLink } from 'lucide-react';
import '../Manager/ManagerDashboard.css';
import '../Manager/TeamManagement.css';
import './UsefulLinksPage.css';

// A bare hostname/URL typed without a scheme (e.g. "example.com") would
// otherwise resolve as a path relative to this app - always give it one.
const normalizeUrl = (url) => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const ROLE_OPTIONS = [
  { value: 'planner', label: 'Planner' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior_manager', label: 'Senior Manager' },
];
const ROLE_LABELS = { planner: 'Planner', manager: 'Manager', senior_manager: 'Senior Manager' };
const ALL_ROLES = ROLE_OPTIONS.map((r) => r.value);

const visibilityLabel = (roles) => {
  if (!roles || roles.length === 0) return 'Hidden from everyone (draft)';
  if (roles.length === ALL_ROLES.length) return 'Visible to everyone';
  return `Visible to: ${roles.map((r) => ROLE_LABELS[r] || r).join(', ')}`;
};

const emptyForm = { title: '', url: '', description: '', visibleRoles: [...ALL_ROLES] };

// Shown as its own "Useful Links" tab on every dashboard (Manager, Senior
// Manager, Planner, Admin). Everyone can open a link in a new tab; only an
// Admin account can add, edit, remove entries, or pick which roles a link
// is visible to.
const UsefulLinksPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadLinks = useCallback(async () => {
    try {
      const list = await linksService.getLinks();
      setLinks(list);
    } catch (error) {
      console.error('Error loading links:', error);
      toast.error('Failed to load links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Admin manages every link and sees them all, regardless of visibility.
  // Everyone else only sees links their role has been given access to.
  const visibleLinks = isAdmin
    ? links
    : links.filter((l) => (l.visible_roles || []).includes(user?.role));

  const openForCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openForEdit = (link) => {
    setForm({
      title: link.title,
      url: link.url,
      description: link.description || '',
      visibleRoles: link.visible_roles && link.visible_roles.length ? [...link.visible_roles] : [],
    });
    setEditingId(link.id);
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
    if (!form.title.trim() || !form.url.trim()) {
      toast.error('Title and link are required');
      return;
    }

    setSaving(true);
    try {
      const fields = {
        title: form.title.trim(),
        url: normalizeUrl(form.url),
        description: form.description.trim() || null,
        visible_roles: form.visibleRoles,
      };

      if (editingId) {
        await linksService.updateLink(editingId, fields);
        toast.success('Link updated');
      } else {
        await linksService.createLink({ ...fields, createdBy: user.id });
        toast.success('Link added');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      loadLinks();
    } catch (error) {
      console.error('Error saving link:', error);
      toast.error('Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (link) => {
    if (!window.confirm(`Remove "${link.title}"?`)) return;
    setBusyId(link.id);
    try {
      await linksService.deleteLink(link.id);
      toast.success('Link removed');
      loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to remove link');
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
          <h1 className="header-title">USEFUL LINKS</h1>
        </div>
        {isAdmin && (
          <button type="button" className="cta-button" style={{ marginTop: 0 }} onClick={openForCreate}>
            + ADD LINK
          </button>
        )}
      </div>

      <div className="card">
        {visibleLinks.length === 0 ? (
          <div className="no-data">
            {isAdmin ? 'No links yet - add the first one for your team.' : 'No links have been added yet.'}
          </div>
        ) : (
          <div className="links-grid">
            {visibleLinks.map((link) => (
              <div className="link-card" key={link.id}>
                <div className="link-card-body">
                  <h3>{link.title}</h3>
                  {link.description && <p>{link.description}</p>}
                  {isAdmin && (
                    <span className="link-visibility-tag">{visibilityLabel(link.visible_roles)}</span>
                  )}
                </div>
                <div className="link-card-actions">
                  <a className="cta-button link-open-btn" href={link.url} target="_blank" rel="noopener noreferrer">
                    Open Link <ExternalLink size={14} />
                  </a>
                  {isAdmin && (
                    <div className="team-actions">
                      <button type="button" className="action-btn" onClick={() => openForEdit(link)}>Edit</button>
                      <button
                        type="button"
                        className="action-btn action-btn-danger"
                        disabled={busyId === link.id}
                        onClick={() => handleDelete(link)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="summary-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>{editingId ? 'Edit Link' : 'Add Link'}</h2>
              <button className="summary-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="summary-modal-body team-form" onSubmit={handleSave}>
              <label className="field-label">Title</label>
              <input
                className="form-control"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Company Policy Portal"
              />

              <label className="field-label">Link (URL)</label>
              <input
                className="form-control"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="e.g. https://example.com"
              />

              <label className="field-label">Description</label>
              <textarea
                className="form-control"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this link for?"
              />

              <label className="field-label">Who can see this link?</label>
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
                  No roles selected - this link will be saved but won&apos;t show up for anyone yet.
                </div>
              )}

              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsefulLinksPage;
