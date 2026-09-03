import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { coachingService } from '../../services/coachingService';
import { formatDate } from '../../utils/dateHelpers';
import { CheckCircle2, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import './PlannerDashboard.css';

const PendingConfirmations = () => {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [confirmComment, setConfirmComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadPendingSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const loadPendingSessions = async () => {
    setLoading(true);
    try {
      const { data } = await coachingService.getPendingConfirmations(profile.id);
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load pending confirmations');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSession = async () => {
    if (!selectedSession) return;

    setConfirming(true);
    try {
      await coachingService.confirmCoachingSession(
        selectedSession.id,
        profile.id,
        confirmComment || null
      );

      toast.success('Coaching session confirmed!');
      setSelectedSession(null);
      setConfirmComment('');
      loadPendingSessions();
    } catch (error) {
      console.error('Error confirming session:', error);
      toast.error('Failed to confirm coaching session');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your pending confirmations...</p>
      </div>
    );
  }

  return (
    <div className="planner-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Coaching Confirmations</h1>
          <p className="text-muted">
            Confirm coaching sessions from your manager
          </p>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="section">
          <div className="empty-state">
            <CheckCircle2 size={48} />
            <p>No pending confirmations</p>
            <p className="text-muted">All your coaching sessions have been confirmed!</p>
          </div>
        </div>
      ) : (
        <div className="section">
          <p className="section-description">
            You have {sessions.length} coaching session{sessions.length !== 1 ? 's' : ''} to confirm:
          </p>

          <div className="sessions-grid">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`session-card clickable ${
                  selectedSession?.id === session.id ? 'selected' : ''
                }`}
                onClick={() => {
                  if (selectedSession?.id === session.id) {
                    setSelectedSession(null);
                  } else {
                    setSelectedSession(session);
                    setConfirmComment('');
                  }
                }}
              >
                <div className="session-header">
                  <h3>
                    {session.manager.first_name} {session.manager.last_name}
                  </h3>
                  <span className="badge badge-warning">Awaiting Confirmation</span>
                </div>

                <div className="session-details">
                  <p>
                    <strong>Coaching Date:</strong> {formatDate(session.coaching_date)}
                  </p>
                  <p>
                    <strong>Topics Discussed:</strong>{' '}
                    {session.coaching_assessments?.length || 0} items
                  </p>

                  {session.coaching_assessments && session.coaching_assessments.length > 0 && (
                    <div className="assessments-preview">
                      <strong>Competency Assessments:</strong>
                      <ul>
                        {session.coaching_assessments.slice(0, 3).map(assessment => (
                          <li key={assessment.id}>
                            <span className="rating-badge">
                              {assessment.competency_rating}
                            </span>
                          </li>
                        ))}
                        {session.coaching_assessments.length > 3 && (
                          <li>+{session.coaching_assessments.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {session.observations && (
                    <div className="session-notes">
                      <strong>Feedback from your manager:</strong>
                      <p>{session.observations}</p>
                    </div>
                  )}

                  {session.action_items && session.action_items.length > 0 && (
                    <div className="action-items-preview">
                      <strong>Action Items ({session.action_items.length}):</strong>
                      <ul>
                        {session.action_items.map(item => (
                          <li key={item.id}>
                            <span className="status-badge">{item.status}</span>
                            {item.action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {session.follow_up_required && session.follow_up_date && (
                    <div className="follow-up-info">
                      <strong>Follow-up Scheduled:</strong>{' '}
                      {formatDate(session.follow_up_date)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Coaching Session</h2>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedSession(null)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="confirmation-details">
                <p className="detail-item">
                  <strong>Manager:</strong>{' '}
                  {selectedSession.manager.first_name} {selectedSession.manager.last_name}
                </p>
                <p className="detail-item">
                  <strong>Coaching Date:</strong> {formatDate(selectedSession.coaching_date)}
                </p>
                <p className="detail-item">
                  <strong>Topics Discussed:</strong>{' '}
                  {selectedSession.coaching_assessments?.length || 0} items
                </p>

                <div className="confirmation-message">
                  <FileText size={20} />
                  <p>
                    By confirming, you acknowledge that this coaching session took place
                    and that the assessment, feedback, and agreed action items were
                    discussed with you.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="comment">
                    Add a Comment (Optional)
                  </label>
                  <textarea
                    id="comment"
                    value={confirmComment}
                    onChange={(e) => setConfirmComment(e.target.value)}
                    placeholder="Any feedback or comments about this coaching session..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedSession(null)}
                disabled={confirming}
              >
                Cancel
              </button>
              <button
                className="btn-primary btn-success"
                onClick={handleConfirmSession}
                disabled={confirming}
              >
                <CheckCircle2 size={18} />
                {confirming ? 'Confirming...' : 'Confirm Coaching Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingConfirmations;
