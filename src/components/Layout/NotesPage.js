import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { notesService } from '../../services/notesService';
import toast from 'react-hot-toast';
import '../Manager/ManagerDashboard.css';

// A private scratchpad for Senior Manager, Manager, and Planner accounts -
// one note per user, visible and editable only by that user. Nothing here
// is shared with anyone else, including their own manager.
const NotesPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadNote = useCallback(async () => {
    if (!user?.id) return;
    try {
      const note = await notesService.getMyNote(user.id);
      setContent(note?.content || '');
      setSavedContent(note?.content || '');
      setUpdatedAt(note?.updated_at || null);
    } catch (error) {
      console.error('Error loading note:', error);
      toast.error('Failed to load your note');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const formatHeaderDate = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  const hasUnsavedChanges = content !== savedContent;

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await notesService.saveNote(user.id, content);
      setSavedContent(saved.content);
      setUpdatedAt(saved.updated_at);
      toast.success('Note saved');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save your note');
    } finally {
      setSaving(false);
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
          <h1 className="header-title">NOTES</h1>
        </div>
        <div className="header-date">{formatHeaderDate()}</div>
      </div>

      <div className="card">
        <p className="info-text" style={{ marginBottom: '1rem' }}>
          A private space just for you - nobody else can see or edit this note.
        </p>

        <textarea
          className="form-control"
          style={{ minHeight: '380px', width: '100%', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write anything you want to keep track of here..."
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span className="info-text">
            {updatedAt ? `Last saved ${new Date(updatedAt).toLocaleString()}` : 'Not saved yet'}
            {hasUnsavedChanges ? ' · unsaved changes' : ''}
          </span>
          <button
            type="button"
            className="cta-button"
            style={{ marginTop: 0 }}
            disabled={saving || !hasUnsavedChanges}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
