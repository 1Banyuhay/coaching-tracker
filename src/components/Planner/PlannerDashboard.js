import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { AlertCircle, History, TrendingUp } from 'lucide-react';
import './PlannerDashboard.css';

const PlannerDashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [coachingHistory, setCoachingHistory] = useState([]);
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    if (profile?.id) {
      const loadDashboardData = async () => {
        const data = await dashboardService.getPlannerDashboard(profile.id);
        setPendingSessions(data.pendingSessions);
        setCoachingHistory(data.coachingHistory);
        setActionItems(data.actionItems);
        setLoading(false);
      };
      loadDashboardData();
    }
  }, [profile?.id]);

  const formatHeaderDate = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDaysLeft = (dueDate) => {
    if (!dueDate) return '';
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Due today';
    return `${diff} days left`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your coaching dashboard...</p>
      </div>
    );
  }

  const pendingCount = pendingSessions.length;
  const acknowledgedCount = coachingHistory.length;
  const activeActionItems = actionItems.filter(a => a.status !== 'completed').length;

  return (
    <div className="planner-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>COACHING DASHBOARD</h1>
        </div>
        <div className="header-date">{formatHeaderDate()}</div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Coaching Sessions This Month</div>
          <div className="metric-value">{acknowledgedCount}</div>
          <div className="metric-detail">sessions completed</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Coaching Sessions YTD</div>
          <div className="metric-value">{acknowledgedCount}</div>
          <div className="metric-detail">year to date</div>
        </div>
        <div className="metric-card alert">
          <div className="metric-label">Pending Confirmations</div>
          <div className="metric-value warning">{pendingCount}</div>
          <div className="metric-detail">awaiting your acknowledgement</div>
        </div>
        <div className="metric-card alert">
          <div className="metric-label">Follow-ups Due</div>
          <div className="metric-value warning">0</div>
          <div className="metric-detail">scheduled follow-ups</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Action Items</div>
          <div className="metric-value">{activeActionItems}</div>
          <div className="metric-detail">in progress</div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">PENDING CONFIRMATIONS</h2>
        {pendingSessions.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <p className="empty-text">No pending confirmations</p>
            <p className="empty-subtext">All your coaching sessions are confirmed</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th>Topic</th>
                <th>Coaching Date</th>
                <th>Competency Level</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingSessions.map(session => (
                <tr key={session.id}>
                  <td><strong>{session.manager?.first_name} {session.manager?.last_name}</strong></td>
                  <td className="topic-name">{session.topic || 'General'}</td>
                  <td>{formatDate(session.coaching_date)}</td>
                  <td>
                    <div className="competency-mini">
                      <div className="competency-bar">
                        <div className="competency-indicator" style={{ width: `${(session.competency_level || 1) * 25}%` }}></div>
                      </div>
                      <div className="competency-label">{['Need Coaching', 'Developing', 'Competent', 'Proficient'][session.competency_level - 1]}</div>
                    </div>
                  </td>
                  <td><span className="status-badge status-pending">Pending</span></td>
                  <td><button className="action-btn">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">YOUR COACHING HISTORY</h2>
        <div className="filter-controls">
          <label htmlFor="history-rows">Show:</label>
          <select id="history-rows" defaultValue="50">
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        {coachingHistory.length === 0 ? (
          <div className="empty-state">
            <History size={48} />
            <p className="empty-text">No coaching history yet</p>
            <p className="empty-subtext">Your coaching sessions will appear here once acknowledged</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th>Topic</th>
                <th>Coaching Date</th>
                <th>Competency Level</th>
                <th>Acknowledged</th>
                <th>Follow-Up</th>
              </tr>
            </thead>
            <tbody>
              {coachingHistory.map(session => (
                <tr key={session.id}>
                  <td><strong>{session.manager?.first_name} {session.manager?.last_name}</strong></td>
                  <td className="topic-name">{session.topic || 'General'}</td>
                  <td>{formatDate(session.coaching_date)}</td>
                  <td>
                    <div className="competency-mini">
                      <div className="competency-bar">
                        <div className="competency-indicator" style={{ width: `${(session.competency_level || 1) * 25}%` }}></div>
                      </div>
                      <div className="competency-label">{['Need Coaching', 'Developing', 'Competent', 'Proficient'][session.competency_level - 1]}</div>
                    </div>
                  </td>
                  <td><span className="status-badge status-acknowledged">✓ Acknowledged</span></td>
                  <td>{formatDate(session.follow_up_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">YOUR ACTION ITEMS</h2>
        <div className="filter-controls">
          <label htmlFor="action-rows">Show:</label>
          <select id="action-rows" defaultValue="50">
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        {actionItems.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={48} />
            <p className="empty-text">No action items assigned</p>
            <p className="empty-subtext">Action items from coaching sessions will appear here</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Action Item</th>
                <th>From Topic</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Days Left</th>
              </tr>
            </thead>
            <tbody>
              {actionItems.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.description}</strong></td>
                  <td>General</td>
                  <td>{formatDate(item.due_date)}</td>
                  <td>
                    <span className={`status-badge status-${item.status}`}>
                      {item.status === 'completed' ? '✓ Completed' : item.status === 'overdue' ? '● Overdue' : '● In Progress'}
                    </span>
                  </td>
                  <td>{getDaysLeft(item.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="profile-section">
        <div className="profile-card">
          <h3>Your Competency Progression</h3>
          <div className="progress-item">
            <div className="progress-label">Product Positioning</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '60%' }}></div>
            </div>
            <div className="progress-status">Developing → Competent</div>
          </div>
          <div className="progress-item">
            <div className="progress-label">FNA / FBB</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '75%' }}></div>
            </div>
            <div className="progress-status">Competent</div>
          </div>
          <div className="progress-item">
            <div className="progress-label">Client Conversation</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '100%' }}></div>
            </div>
            <div className="progress-status">Proficient</div>
          </div>
        </div>
        <div className="profile-card">
          <h3>Coaching Statistics</h3>
          <div className="progress-item">
            <div className="progress-label">Sessions This Month</div>
            <div className="stat-display">{acknowledgedCount}</div>
            <div className="stat-detail">Consistent engagement</div>
          </div>
          <div className="progress-item">
            <div className="progress-label">Average Competency</div>
            <div className="stat-display">2.8</div>
            <div className="stat-detail">On the path to proficiency</div>
          </div>
          <div className="progress-item">
            <div className="progress-label">Completion Rate</div>
            <div className="stat-display stat-success">100%</div>
            <div className="stat-detail">All sessions acknowledged</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerDashboard;
