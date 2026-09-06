import React from 'react';
import { X } from 'lucide-react';
import CoachingSessionsTable from './CoachingSessionsTable';

// Shown when a planner's name is clicked from a roster list (Manager's "My
// Planners" page, Senior Manager's "By Planners" tab). Lists every
// coaching session that planner has, with each topic still clickable
// through to the full CoachingDetailModal for that one session.
const PlannerCoachingModal = ({
  planner,
  sessions,
  coachColumnLabel,
  onSelectTopic,
  onStartSession,
  onClose,
}) => {
  if (!planner) return null;

  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summary-modal-header">
          <div>
            <h2>{planner.full_name}</h2>
            <p className="summary-modal-subtitle">{planner.branch || 'Coaching history'}</p>
          </div>
          <button className="summary-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="summary-modal-body">
          <CoachingSessionsTable
            sessions={sessions}
            recipientLabel="Planner"
            coachColumnLabel={coachColumnLabel}
            onSelectTopic={onSelectTopic}
            emptyMessage="No coaching sessions logged with this planner yet"
          />

          {onStartSession && (
            <button type="button" className="cta-button" onClick={() => onStartSession(planner)}>
              + LOG COACHING SESSION
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlannerCoachingModal;
