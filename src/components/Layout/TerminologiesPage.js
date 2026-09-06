import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { termsService } from '../../services/termsService';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp } from 'lucide-react';
import '../Manager/ManagerDashboard.css';
import '../Manager/TeamManagement.css';
import './UsefulLinksPage.css';
import './TerminologiesPage.css';

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

const emptyForm = { term: '', explanation: '', visibleRoles: [...ALL_ROLES] };

// "Terminologies" - a shared glossary shown as its own link right above
// Useful Links on every dashboard. Everyone can click a term to see its
// explanation; only an Admin account can add, edit, remove terms, or pick
// which roles can see each one. Content is added later via Admin.
const TerminologiesPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [openTermId, setOpenTermId] = useState(null);

  const loadTerms = useCallback(async () => {
    try {
      const list = await termsService.getAllTerms();
      setTerms(list);
    } catch (error) {
      console.error('Error loading terminologies:', error);
      toast.error('Failed to load terminologies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  // Admin manages every term and sees them all, regardless of visibility.
  // Everyone else only sees terms their role has been given access to.
  const visibleTerms = isAdmin ? terms : terms.filter((t) => (t.visible_roles || []).includes(user?.role));

  const openForCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openForEdit = (term) => {
    setForm({
      term: term.term,
      explanation: term.explanation || '',
      visibleRoles: term.visible_roles && term.visible_roles.length ? [...term.visible_roles] : [],
    });
    setEditingId(term.id);
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
    if (!form.term.trim()) {
      toast.error('Term name is required');
      return;
    }

    setSaving(true);
    try {
      const fields = {
        term: form.term.trim(),
        explanation: form.explanation.trim() || null,
        visible_roles: form.visibleRoles,
      };

      if (editingId) {
        await termsService.updateTerm(editingId, fields);
        toast.success('Term updated');
      } else {
        await termsService.createTerm(fields);
        toast.success('Term added');
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      loadTerms();
    } catch (error) {
      console.error('Error saving term:', error);
      toast.error(error.message || 'Failed to save term');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (term) => {
    if (!window.confirm(`Remove "${term.term}"?`)) return;
    setBusyId(term.id);
    try {
      await termsService.deleteTerm(term.id);
      toast.success('Term removed');
      loadTerms();
    } catch (error) {
      console.error('Error deleting term:', error);
      toast.error('Failed to remove term');
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
          <h1 className="header-title">TERMINOLOGIES</h1>
        </div>
        {isAdmin && (
          <button type="button" className="cta-button" style={{ marginTop: 0 }} onClick={openForCreate}>
            + ADD TERM
          </button>
        )}
      </div>

      <div className="card">
        {visibleTerms.length === 0 ? (
          <div className="no-data">
            {isAdmin ? 'No terms yet - add the first one.' : 'No terminologies have been added yet.'}
          </div>
        ) : (
          <div className="terms-list">
            {visibleTerms.map((t) => {
              const isOpen = openTermId === t.id;
              return (
                <div className="term-item" key={t.id}>
                  <button type="button" className="term-question" onClick={() => setOpenTermId(isOpen ? null : t.id)}>
                    <span>{t.term}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="term-answer">
                      <p>{t.explanation || 'No explanation added yet.'}</p>
                      {isAdmin && (
                        <>
                          <span className="link-visibility-tag">{visibilityLabel(t.visible_roles)}</span>
                          <div className="team-actions" style={{ marginTop: '0.75rem' }}>
                            <button type="button" className="action-btn" onClick={() => openForEdit(t)}>Edit</button>
                            <button
                              type="button"
                              className="action-btn action-btn-danger"
                              disabled={busyId === t.id}
                              onClick={() => handleDelete(t)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="summary-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>{editingId ? 'Edit Term' : 'Add Term'}</h2>
              <button className="summary-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="summary-modal-body team-form" onSubmit={handleSave}>
              <label className="field-label">Term</label>
              <input
                className="form-control"
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                placeholder="e.g. FNA"
              />

              <label className="field-label">Explanation</label>
              <textarea
                className="form-control"
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="What does this term mean?"
              />

              <label className="field-label">Who can see this term?</label>
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
                  No roles selected - this term will be saved but won&apos;t show up for anyone yet.
                </div>
              )}

              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminologiesPage;
