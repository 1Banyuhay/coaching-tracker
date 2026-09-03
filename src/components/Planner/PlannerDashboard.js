import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { coachingService } from '../../services/coachingService';
import { userService } from '../../services/userService';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateHelpers';
import { AlertCircle, CheckCircle2, History } from 'lucide-react';
import toast from 'react-hot-toast';
import './PlannerDashboard.css';

const PlannerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    coachingThisMonth: 0,
    coachingYTD: 0,
    pendingConfirmations: 0,
    followUpsDue: 0,
    activeActionItems: 0,
  });
  const [pendingSessions, setPendingSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get planner profile with stats
      const { data: profileData } = await userService.getPlannerProfile(profile.id);
      if (profileData) {
        setStats(profileData.stats);
      }

      // Get pending confirmations
      const { data: pending } = await coachingService.getPendingConfirmations(profile.id);
      setPendingSessions(pending || []);

      // Get coaching history
      const { data: history } = await coachingService.getPlannerCoachingHistory(profile.id);
      setRecentSessions((history || []).slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSession = (sessionId) => {
    navigate('/planner/confirmations', { state: { sessionId } });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your coaching dashboard...</p>
      </div>
    );
  }

  return (
    <div className="planner-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Your Coaching Dashboard</h1>
          <p className="text-muted">Track your coaching progress and confirmations</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-label">Coaching Sessions This Month</div>
          <div className="stat-value">{stats.coachingThisMonth}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Coaching Sessions YTD</div>
          <div className="stat-value">{stats.coachingYTD}</div>
        </div>

        <div className="stat-card alert">
          <div className="stat-label">Pending Confirmations</div>
          <div className="stat-value warning">{stats.pendingConfirmations}</div>
        </div>

        <div className="stat-card alert">
          <div className="stat-label">Follow-ups Due</div>
          <div className="stat-value warning">{stats.followUpsDue}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Action Items</div>
          <div className="stat-value">{stats.activeActionItems}</div>
        </div>
      </div>

      {/* Pending Confirmations Section */}
      {pendingSessions.length > 0 && (
        <div className="section pending-section">
          <div className="section-header">
            <AlertCircle size={24} className="icon warning" />
            <h2>Pending Confirmations</h2>
          </div>
          <p className="section-description">
            You have {pendingSessions.length} coaching session{pendingSessions.length !== 1 ? 's' : ''} awaiting your confirmation
          </p>

          <div className="sessions-list">
            {pendingSessions.map(session => (
              <div key={session.id} className="session-card pending">
                <div className="session-header">
                  <h3>{session.manager.first_name} {session.manager.last_name}</h3>
                  <span className="badge badge-warning">Awaiting Confirmation</span>
                </div>
                <div className="session-details">
                  <p>
                    <strong>Date:</strong> {formatDate(session.coaching_date)}
                  </p>
                  <p>
                    <strong>Topics:</strong> {session.coaching_assessments?.length || 0} items discussed
                  </p>
                  {session.follow_up_required && (
                    <p className="follow-up">
                      <strong>Follow-up Scheduled:</strong> {formatDate(session.follow_up_date)}
                    </p>
                  )}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => handleConfirmSession(session.id)}
                >
                  <CheckCircle2 size={18} />
                  Confirm Coaching Session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Coaching History */}
      <div className="section">
        <div className="section-header">
          <History size={24} className="icon" />
          <h2>Recent Coaching Sessions</h2>
        </div>

        {recentSessions.length === 0 ? (
          <div className="empty-state">
            <History size={48} />
            <p>No coaching sessions yet</p>
          </div>
        ) : (
          <div className="sessions-list">
            {recentSessions.map(session => (
              <div key={session.id} className="session-card">
                <div className="session-header">
                  <h3>{session.manager.first_name} {session.manager.last_name}</h3>
                  <span className={`badge badge-${getStatusClass(session.status)}`}>
                    {getStatusLabel(session.status)}
                  </span>
                </div>
                <div className="session-details">
                  <p>
                    <strong>Date:</strong> {formatDate(session.coaching_date)}
                  </p>
                  <p>
                    <strong>Topics Discussed:</strong> {session.coaching_assessments?.length || 0} items
                  </p>
                  {session.observations && (
                    <p className="observations">
                      <strong>Feedback:</strong> {session.observations}
                    </p>
                  )}
                  {session.follow_up_required && (
                    <p className="follow-up">
                      <strong>Follow-up:</strong> {formatDate(session.follow_up_date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {recentSessions.length > 0 && (
          <button
            className="btn-secondary"
            onClick={() => navigate('/planner/confirmations')}
          >
            View All Coaching History
          </button>
        )}
      </div>
    </div>
  );
};

const getStatusClass = (status) => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'awaiting_planner_confirmation':
      return 'warning';
    default:
      return 'gray';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'awaiting_planner_confirmation':
      return 'Awaiting Your Confirmation';
    default:
      return status;
  }
};

export default PlannerDashboard;
