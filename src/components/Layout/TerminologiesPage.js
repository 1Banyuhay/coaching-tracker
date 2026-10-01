import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { termsService } from '../../services/termsService';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
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
const UNCATEGORIZED = 'Uncategorized';

// Categories are stored with a leading letter, e.g. "A. Life Insurance
// Fundamentals" - that keeps them sorted in the right order and keeps the
// admin's category picker unambiguous, but on screen we only want the
// name itself, so this strips the "A. " part just for display.
const displayCategory = (category) => category.replace(/^[A-Za-z]\.\s*/, '');

const visibilityLabel = (roles) => {
  if (!roles || roles.length === 0) return 'Hidden from everyone (draft)';
  if (roles.length === ALL_ROLES.length) return 'Visible to everyone';
  return `Visible to: ${roles.map((r) => ROLE_LABELS[r] || r).join(', ')}`;
};

const emptyForm = { term: '', category: '', definition: '', example: '', visibleRoles: [...ALL_ROLES] };

// "Terminologies" - a shared glossary shown as its own link right above
// Useful Links on every dashboard. Terms are grouped by category (a
// section header, e.g. "A. Life Insurance Fundamentals") - click a
// category to expand its terms, then click a term to reveal its
// Definition and, where there is one, a worked Example. Only an Admin
// account can add, edit, remove terms, or pick which roles see each one.
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
  const [openCategories, setOpenCategories] = useState(() => new Set());
  const [openTermId, setOpenTermId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchWrapRef = useRef(null);

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

  const groupedByCategory = useMemo(() => {
    const groups = new Map();
    visibleTerms.forEach((t) => {
      const key = t.category && t.category.trim() ? t.category.trim() : UNCATEGORIZED;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });
    return [...groups.entries()]
      .map(([category, list]) => [category, list.sort((a, b) => a.term.localeCompare(b.term))])
      .sort((a, b) => {
        if (a[0] === UNCATEGORIZED) return 1;
        if (b[0] === UNCATEGORIZED) return -1;
        return a[0].localeCompare(b[0]);
      });
  }, [visibleTerms]);

  const existingCategories = useMemo(
    () => [...new Set(terms.map((t) => t.category).filter(Boolean))].sort(),
    [terms]
  );

  // Typeahead suggestions by term name only - prefix matches first (what
  // you'd expect typing the start of a word), then anywhere-in-the-name
  // matches, each group alphabetical. Capped at 8 so the dropdown never
  // grows past a glance.
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const starts = [];
    const contains = [];
    visibleTerms.forEach((t) => {
      const name = t.term.toLowerCase();
      if (name.startsWith(q)) starts.push(t);
      else if (name.includes(q)) contains.push(t);
    });
    const byName = (a, b) => a.term.localeCompare(b.term);
    return [...starts.sort(byName), ...contains.sort(byName)].slice(0, 8);
  }, [searchQuery, visibleTerms]);

  // Picking a suggestion (click or Enter) jumps straight to that term:
  // expand its category, open it, scroll it into view - same as clicking
  // it directly in the accordion, just without having to find it first.
  const selectSearchResult = (term) => {
    const category = term.category && term.category.trim() ? term.category.trim() : UNCATEGORIZED;
    setOpenCategories((prev) => new Set(prev).add(category));
    setOpenTermId(term.id);
    setSearchQuery('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    requestAnimationFrame(() => {
      document.getElementById(`term-${term.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = suggestions[highlightedIndex] ?? suggestions[0];
      if (pick) selectSearchResult(pick);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (category) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const openForCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openForEdit = (term) => {
    setForm({
      term: term.term,
      category: term.category || '',
      definition: term.definition || '',
      example: term.example || '',
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
        category: form.category.trim() || null,
        definition: form.definition.trim() || null,
        example: form.example.trim() || null,
        visible_roles: form.visibleRoles,
      };

      if (editingId) {
        await termsService.updateTerm(editingId, fields);
        toast.success('Term updated');
      } else {
        await termsService.createTerm({ ...fields, visibleRoles: fields.visible_roles });
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
        <div className="term-search" ref={searchWrapRef}>
          <Search size={16} className="term-search-icon" />
          <input
            type="text"
            className="term-search-input"
            placeholder="Search terminologies..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button
              type="button"
              className="term-search-clear"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
                setHighlightedIndex(-1);
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {showSuggestions && searchQuery.trim() && (
            <div className="term-search-suggestions">
              {suggestions.length === 0 ? (
                <div className="term-search-empty">No terms match &quot;{searchQuery.trim()}&quot;</div>
              ) : (
                suggestions.map((t, i) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`term-search-suggestion ${i === highlightedIndex ? 'active' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    onClick={() => selectSearchResult(t)}
                  >
                    <span className="term-search-suggestion-name">{t.term}</span>
                    <span className="term-search-suggestion-category">{displayCategory(t.category && t.category.trim() ? t.category.trim() : UNCATEGORIZED)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {groupedByCategory.length === 0 ? (
          <div className="no-data">
            {isAdmin ? 'No terms yet - add the first one.' : 'No terminologies have been added yet.'}
          </div>
        ) : (
          <div className="category-list">
            {groupedByCategory.map(([category, categoryTerms]) => {
              const isCategoryOpen = openCategories.has(category);
              return (
                <div className="category-item" key={category}>
                  <button type="button" className="category-question" onClick={() => toggleCategory(category)}>
                    <span className="category-question-label">
                      <ChevronRight size={16} className={`category-chevron ${isCategoryOpen ? 'open' : ''}`} />
                      {displayCategory(category)}
                    </span>
                    <span className="category-count">{categoryTerms.length}</span>
                  </button>

                  {isCategoryOpen && (
                    <div className="terms-list">
                      {categoryTerms.map((t) => {
                        const isOpen = openTermId === t.id;
                        return (
                          <div className="term-item" key={t.id} id={`term-${t.id}`}>
                            <button type="button" className="term-question" onClick={() => setOpenTermId(isOpen ? null : t.id)}>
                              <span>{t.term}</span>
                              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            {isOpen && (
                              <div className="term-answer">
                                <div className="term-answer-block">
                                  <div className="term-answer-label">Definition</div>
                                  <p>{t.definition || 'No definition added yet.'}</p>
                                </div>
                                {t.example && (
                                  <div className="term-answer-block">
                                    <div className="term-answer-label">Example</div>
                                    <p>{t.example}</p>
                                  </div>
                                )}
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
                placeholder="e.g. Face Amount"
              />

              <label className="field-label">Category</label>
              <input
                className="form-control"
                list="terminology-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. A. Life Insurance Fundamentals"
              />
              <datalist id="terminology-categories">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>

              <label className="field-label">Definition</label>
              <textarea
                className="form-control"
                value={form.definition}
                onChange={(e) => setForm({ ...form, definition: e.target.value })}
                placeholder="What does this term mean?"
              />

              <label className="field-label">Example (optional)</label>
              <textarea
                className="form-control"
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
                placeholder="A short worked example, if one helps"
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
