import React from 'react';
import { formatDate } from '../../utils/dateHelpers';
import {
  followUpStatus,
  canLogFollowUp as computeCanLogFollowUp,
  isAcknowledgeExpired,
  acknowledgeWindowStatus,
} from '../../services/dashboardService';

const COMPETENCY_LABELS = ['Need Coaching', 'Developing', 'Competent', 'Proficient'];

const competencyLabel = (level) => {
  if (!level) return '—';
  const rounded = Math.round(level);
  return COMPETENCY_LABELS[Math.min(Math.max(rounded, 1), 4) - 1];
};

// A record that ran out its 24-hour acknowledge window stays 'pending' in
// the database forever (see isAcknowledgeExpired) - it just stops
// displaying as "Pending" and shows as "Expired" instead, so it's still
// visible in history but clearly flagged as not counted.
const statusInfo = (session) => {
  if (isAcknowledgeExpired(session)) return { cls: 'status-expired', label: 'Expired' };
  if (session.status === 'coaching_complete') return { cls: 'status-coaching', label: 'Completed' };
  if (session.status === 'acknowledged') return { cls: 'status-acknowledged', label: 'Acknowledged' };
  return { cls: 'status-pending', label: 'Pending' };
};

// Shared coaching-sessions table used across the Manager, Senior Manager
// and Planner dashboards - Recipient / Topic (clickable) / Competency /
// Coaching Date / Follow-Up Date (with a due-soon or overdue badge) /
// Status / an optional "Log Follow-Up" action.
//
// `recipientLabel`: header + empty-state wording ("Planner" or "Manager").
// `onSelectTopic(session)`: opens the coaching detail modal.
// `onLogFollowUp(session)`: optional - when provided, a "Log Follow-Up"
//   button appears on any row that has a follow-up date, hasn't already
//   been followed up on, and isn't already marked complete.
// `coachColumnLabel`: optional - when provided, adds a column (right after
//   the recipient) showing who coached that session (session.coach_name).
//   Used on the Senior Manager's "Coaching Sessions with Planners" table,
//   where the coach could be any of several Managers, not just one person.
const CoachingSessionsTable = ({
  sessions,
  recipientLabel = 'Planner',
  onSelectTopic,
  onLogFollowUp,
  emptyMessage,
  coachColumnLabel,
}) => {
  if (!sessions || sessions.length === 0) {
    return <div className="no-data">{emptyMessage || `No coaching sessions with ${recipientLabel.toLowerCase()}s yet`}</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>{recipientLabel}</th>
          {coachColumnLabel && <th>{coachColumnLabel}</th>}
          <th>Topic</th>
          <th>Competency</th>
          <th>Coaching Date</th>
          <th>Follow-Up Date</th>
          <th>Status</th>
          {onLogFollowUp && <th></th>}
        </tr>
      </thead>
      <tbody>
        {sessions.map((session) => {
          const due = followUpStatus(session);
          const { cls, label } = statusInfo(session);
          const ackWindow = acknowledgeWindowStatus(session);
          const eligibleForFollowUp = !!onLogFollowUp && computeCanLogFollowUp(session);

          return (
            <tr key={session.id}>
              <td><strong>{session.planner_name}</strong></td>
              {coachColumnLabel && <td>{session.coach_name || '—'}</td>}
              <td>
                <button type="button" className="topic-link" onClick={() => onSelectTopic(session)}>
                  {session.topic || 'General'}
                </button>
              </td>
              <td>{competencyLabel(session.competency_level)}</td>
              <td>{formatDate(session.created_at)}</td>
              <td>
                {session.follow_up_date ? formatDate(session.follow_up_date) : '—'}
                {due && <span className={`due-badge due-${due.level}`}>{due.label}</span>}
              </td>
              <td>
                <span className={`status-badge ${cls}`}>{label}</span>
                {ackWindow?.level === 'urgent' && (
                  <span className="due-badge due-upcoming">{ackWindow.label}</span>
                )}
              </td>
              {onLogFollowUp && (
                <td>
                  {eligibleForFollowUp && (
                    <button type="button" className="action-btn" onClick={() => onLogFollowUp(session)}>
                      Log Follow-Up
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default CoachingSessionsTable;
