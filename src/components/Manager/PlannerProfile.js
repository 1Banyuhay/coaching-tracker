import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { coachingService } from '../../services/coachingService';
import { formatDate } from '../../utils/dateHelpers';
import { ArrowLeft, Mail, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import './PlannerProfile.css';

const PlannerProfile = () => {
  const { plannerId } = useParams();
  const navigate = useNavigate();
  const [planner, setPlanner] = useState(null);
  const [coachingHistory, setCoachingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlannerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerId]);

  const loadPlannerData = async () => {
    setLoading(true);
    try {
      const { data: plannerData } = await userService.getPlannerProfile(plannerId);
      setPlanner(plannerData);

      const { data: history } = await coachingService.getPlannerCoachingHistory(plannerId);
      setCoachingHistory(history || []);
    } catch (error) {
      console.error('Error loading planner data:', error);
      toast.error('Failed to load planner profile');
      navigate('/manager/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading planner profile...</p>
      </div>
    );
  }

  if (!planner) {
    return (
      <div className="error-container">
        <p>Planner not found</p>
        <button className="btn-primary" onClick={() => navigate('/manager/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="planner-profile">
      {/* Header */}
      <div className="profile-header">
        <button
          className="btn-back"
          onClick={() => navigate('/manager/dashboard')}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="profile-info">
          <div className="profile-avatar">
            {planner.first_name.charAt(0)}{planner.last_name.charAt(0)}
          </div>
          <div className="profile-details">
            <h1>{planner.first_name} {planner.last_name}</h1>
            <p className="profile-email">
              <Mail size={16} />
              {planner.email}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Coaching This Month</div>
          <div className="stat-value">{planner.stats?.coachingThisMonth || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Coaching YTD</div>
          <div className="stat-value">{planner.stats?.coachingYTD || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Pending Confirmations</div>
          <div className="stat-value">{planner.stats?.pendingConfirmations || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Follow-ups Due</div>
          <div className="stat-value">{planner.stats?.followUpsDue || 0}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Active Action Items</div>
          <div className="stat-value">{planner.stats?.activeActionItems || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Coaching History
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="section">
              <h2>Profile Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Name</span>
                  <span className="value">{planner.first_name} {planner.last_name}</span>
                </div>
                <div className="info-item">
                  <span className="label">Email</span>
                  <span className="value">{planner.email}</span>
                </div>
                <div className="info-item">
                  <span className="label">Last Coached</span>
                  <span className="value">
                    {planner.stats?.lastCoachingDate
                      ? formatDate(planner.stats.lastCoachingDate)
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            <div className="section">
              <h2>Quick Actions</h2>
              <button className="btn-primary" onClick={() => navigate('/manager/coaching/start')}>
                <FileText size={18} />
                Start Coaching Session
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-tab">
            {coachingHistory.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <p>No coaching history yet</p>
              </div>
            ) : (
              <div className="coaching-timeline">
                {coachingHistory.map(session => (
                  <div key={session.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <h3>
                        {formatDate(session.coaching_date, 'MMM dd, yyyy')}
                        <span className={`status-badge status-${session.status}`}>
                          {session.status === 'confirmed' ? 'Confirmed' : 'Awaiting'}
                        </span>
                      </h3>
                      <p className="topics">
                        <strong>Topics:</strong> {session.coaching_assessments?.length || 0} items
                      </p>
                      {session.observations && (
                        <p className="observations">{session.observations}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlannerProfile;
