import React from 'react';
import { X } from 'lucide-react';
import { formatDate } from '../../utils/dateHelpers';
import { followUpStatus, isAcknowledgeExpired } from '../../services/dashboardService';

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

// Full detail view for a single coaching_records row, opened by clicking a
// Topic cell in any session table.
const CoachingDetailModal = ({ session, recipientLabel = 'Planner', onClose }) => {
  if (!session) return null;
  const due = followUpStatus(session);
  const { cls, label } = statusInfo(session);

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
                {session.follow_up_date ? formatDate(session.follow_up_date) : '—'}
                {due && <span className={`due-badge due-${due.level}`}>{due.label}</span>}
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
