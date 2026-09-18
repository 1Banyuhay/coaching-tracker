import React, { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/dateHelpers';
import { useAuth } from '../../hooks/useAuth';
import {
  followUpStatus,
  isAcknowledgeExpired,
  canEditFollowUpDate,
  updateFollowUpDate,
} from '../../services/dashboardService';

const COMPETENCY_LABELS = ['Need Coaching', 'Developing', 'Competent', 'Proficient'];

const competencyLabel = (level) => {
  if (!level) return '—';
  const rounded = Math.round(level);
  return COMPETENCY_LABELS[Math.min(Math.max(rounded, 1), 4) - 1];
};

// A record that ran out its 24-hour acknowledge window stays 'pending' in
// the database forever - it just displays as Expired instead of Pending.
const statusInfo = (session) => {
  if (isAcknowledgeExpired(session)) return { cls: 'status-expired', label: 'Expired' };
  if (session.status === 'coaching_complete') return { cls: 'status-coaching', label: 'Completed' };
  if (session.status === 'acknowledged') return { cls: 'status-acknowledged', label: 'Acknowledged' };
  return { cls: 'status-pending', label: 'Pending' };
};

// Same today..+15-days window the coaching log form uses when the
// Follow-Up Date is first set - editing it later stays inside that same
// rule rather than opening it back up.
const todayStr = () => new Date().toISOString().slice(0, 10);
const maxFollowUpStr = () => new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

// Full detail view for a single coaching_records row, opened by clicking a
// Topic cell in any session table. The coach who logged it can also
// change its Follow-Up Date here, as long as it hasn't gone Missed, been
// logged against, or been closed out - see canEditFollowUpDate().
// `onFollowUpDateUpdated` (optional) lets the caller refresh its own
// dashboard data in the background after a save.
const CoachingDetailModal = ({ session, recipientLabel = 'Planner', onClose, onFollowUpDateUpdated }) => {
  const { user } = useAuth();
  const [followUpDate, setFollowUpDate] = useState(session?.follow_up_date || '');
  const [editingDate, setEditingDate] = useState(false);
  const [draftDate, setDraftDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const currentSession = { ...session, follow_up_date: followUpDate };
  const due = followUpStatus(currentSession);
  const { cls, label } = statusInfo(session);
  const isCoach = session.coach_id === user?.id;
  const editable = isCoach && canEditFollowUpDate(currentSession);

  const startEditing = () => {
    setDraftDate(followUpDate || todayStr());
    setEditingDate(true);
  };

  const cancelEditing = () => {
    setEditingDate(false);
  };

  const saveDate = async () => {
    if (!draftDate) {
      toast.error('Choose a date first');
      return;
    }
    setSaving(true);
    try {
      await updateFollowUpDate(session.id, draftDate);
      setFollowUpDate(draftDate);
      setEditingDate(false);
      toast.success('Follow-up date updated');
      onFollowUpDateUpdated?.();
    } catch (error) {
      console.error('Error updating follow-up date:', error);
      toast.error('Failed to update the follow-up date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summary-modal-header">
          <div>
            <h2>{session.topic || 'General'}</h2>
          </div>
          <button className="summary-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="summary-modal-body">
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">{recipientLabel}</span>
              <span className="detail-value">{session.planner_name || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Coached By</span>
              <span className="detail-value">{session.coach_name || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Competency</span>
              <span className="detail-value">{competencyLabel(session.competency_level)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Coaching Date</span>
              <span className="detail-value">{formatDate(session.created_at)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Follow-Up Date</span>
              <span className="detail-value">
                {editingDate ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="date"
                      className="form-control"
                      style={{ width: 'auto', display: 'inline-block' }}
                      min={todayStr()}
                      max={maxFollowUpStr()}
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      disabled={saving}
                    />
                    <button type="button" className="action-btn" onClick={saveDate} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className="action-btn" onClick={cancelEditing} disabled={saving}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <>
                    {followUpDate ? formatDate(followUpDate) : '—'}
                    {due && <span className={`due-badge due-${due.level}`}>{due.label}</span>}
                    {editable && (
                      <button
                        type="button"
                        className="action-btn"
                        style={{ marginLeft: '0.5rem' }}
                        onClick={startEditing}
                        aria-label="Change follow-up date"
                      >
                        <Pencil size={12} style={{ marginRight: '0.25rem' }} />
                        Change
                      </button>
                    )}
                  </>
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value"><span className={`status-badge ${cls}`}>{label}</span></span>
            </div>
          </div>

          <div className="detail-block">
            <div className="detail-label">Discussion Notes / Root Cause Analysis (RCA)</div>
            <p className="detail-text">{session.discussion_notes || '—'}</p>
          </div>

          <div className="detail-block">
            <div className="detail-label">Action Items</div>
            <p className="detail-text">{session.action_items || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachingDetailModal;
