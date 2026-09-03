import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { coachingService } from '../../services/coachingService';
import { userService } from '../../services/userService';
import { getDateRange, formatDate } from '../../utils/dateHelpers';
import { Users, FileText, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [stats, setStats] = useState({
    totalPlanners: 0,
    plannersCoached: 0,
    coachingCoverage: 0,
    totalSessions: 0,
    confirmedSessions: 0,
    awaitingConfirmation: 0,
    followUpsDue: 0,
    overdueFollowUps: 0,
    plannersNotCoached: 0,
  });
  const [sessions, setSessions] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [planners, setPlanners] = useState([]); // Used for manager's team context
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customStart, customEnd, profile?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get date range
      const range = dateFilter === 'custom' 
        ? { start: customStart, end: customEnd, label: 'Custom' }
        : getDateRange(dateFilter);

      // Get all planners assigned to this manager
      const { data: managerPlanners } = await userService.getManagerPlanners(profile.id);
      setPlanners(managerPlanners || []);

      // Get coaching sessions for this period
      const { data: coachingSessions } = await coachingService.getManagerCoachingSessions(
        profile.id,
        range.start,
        range.end
      );

      setSessions(coachingSessions || []);

      // Calculate metrics
      calculateMetrics(managerPlanners || [], coachingSessions || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (allPlanners, sessionsThisPeriod) => {
    const today = new Date();

    // Total planners
    const totalPlanners = allPlanners.length;

    // Unique planners coached this period
    const plannersCoached = new Set(sessionsThisPeriod.map(s => s.planner_id)).size;

    // Coaching coverage percentage
    const coverage = totalPlanners > 0 ? Math.round((plannersCoached / totalPlanners) * 100) : 0;

    // Total sessions this period
    const totalSessions = sessionsThisPeriod.length;

    // Confirmed sessions
    const confirmedSessions = sessionsThisPeriod.filter(s => s.status === 'confirmed').length;

    // Awaiting confirmation
    const awaitingConfirmation = sessionsThisPeriod.filter(s => s.status === 'awaiting_planner_confirmation').length;

    // Follow-ups due
    const followUpsDue = sessionsThisPeriod.filter(s => 
      s.follow_up_required && 
      s.follow_up_date && 
      new Date(s.follow_up_date) <= today && 
      s.status !== 'cancelled'
    ).length;

    // Overdue follow-ups (past due date)
    const overdueFollowUps = followUpsDue;

    // Planners not coached this period
    const plannersNotCoached = totalPlanners - plannersCoached;

    setStats({
      totalPlanners,
      plannersCoached,
      coachingCoverage: coverage,
      totalSessions,
      confirmedSessions,
      awaitingConfirmation,
      followUpsDue,
      overdueFollowUps,
      plannersNotCoached,
    });
  };

  const handleStartCoaching = () => {
    navigate('/manager/coaching/start');
  };

  const getDateRangeLabel = () => {
    if (dateFilter === 'custom') {
      return `${formatDate(customStart)} - ${formatDate(customEnd)}`;
    }
    return getDateRange(dateFilter).label;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Coaching Dashboard</h1>
          <p className="text-muted">{getDateRangeLabel()}</p>
        </div>

        <button className="btn-primary" onClick={handleStartCoaching}>
          <Plus size={18} />
          Start Coaching
        </button>
      </div>

      {/* Date Filters */}
      <div className="dashboard-filters">
        <button 
          className={`filter-btn ${dateFilter === 'today' ? 'active' : ''}`}
          onClick={() => setDateFilter('today')}
        >
          Today
        </button>
        <button 
          className={`filter-btn ${dateFilter === 'week' ? 'active' : ''}`}
          onClick={() => setDateFilter('week')}
        >
          This Week
        </button>
        <button 
          className={`filter-btn ${dateFilter === 'month' ? 'active' : ''}`}
          onClick={() => setDateFilter('month')}
        >
          This Month
        </button>
        <button 
          className={`filter-btn ${dateFilter === 'ytd' ? 'active' : ''}`}
          onClick={() => setDateFilter('ytd')}
        >
          Year to Date
        </button>
        <button 
          className={`filter-btn ${dateFilter === 'custom' ? 'active' : ''}`}
          onClick={() => setDateFilter('custom')}
        >
          Custom
        </button>
      </div>

      {/* Custom Date Range */}
      {dateFilter === 'custom' && (
        <div className="custom-date-range">
          <div className="date-input-group">
            <label>From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </div>
          <div className="date-input-group">
            <label>To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-header">
            <Users size={24} className="stat-icon" />
            <div className="stat-label">Total Planners</div>
          </div>
          <div className="stat-value">{stats.totalPlanners}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <CheckCircle2 size={24} className="stat-icon" />
            <div className="stat-label">Unique Planners Coached</div>
          </div>
          <div className="stat-value">{stats.plannersCoached}</div>
          <div className="stat-change">
            {stats.coachingCoverage}% coverage
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <FileText size={24} className="stat-icon" />
            <div className="stat-label">Total Coaching Sessions</div>
          </div>
          <div className="stat-value">{stats.totalSessions}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <CheckCircle2 size={24} className="stat-icon" />
            <div className="stat-label">Confirmed</div>
          </div>
          <div className="stat-value positive">{stats.confirmedSessions}</div>
        </div>

        <div className="stat-card alert">
          <div className="stat-header">
            <AlertCircle size={24} className="stat-icon" />
            <div className="stat-label">Awaiting Confirmation</div>
          </div>
          <div className="stat-value warning">{stats.awaitingConfirmation}</div>
        </div>

        <div className="stat-card alert">
          <div className="stat-header">
            <AlertCircle size={24} className="stat-icon" />
            <div className="stat-label">Follow-ups Due</div>
          </div>
          <div className="stat-value warning">{stats.followUpsDue}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <Users size={24} className="stat-icon" />
            <div className="stat-label">Not Yet Coached</div>
          </div>
          <div className="stat-value">{stats.plannersNotCoached}</div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="section">
        <h2>Recent Coaching Sessions</h2>
        {sessions.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No coaching sessions in this period</p>
            <button className="btn-primary" onClick={handleStartCoaching}>
              Start Your First Coaching Session
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Planner</th>
                  <th>Coaching Date</th>
                  <th>Status</th>
                  <th>Sessions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="planner-cell">
                      <div className="planner-info">
                        <p className="planner-name">
                          {session.planner.first_name} {session.planner.last_name}
                        </p>
                        <p className="planner-email">{session.planner.email}</p>
                      </div>
                    </td>
                    <td>{formatDate(session.coaching_date, 'MMM dd, yyyy')}</td>
                    <td>
                      <span className={`badge badge-${getStatusClass(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                    </td>
                    <td>
                      {session.coaching_assessments ? session.coaching_assessments.length : 0} items
                    </td>
                    <td>
                      <button 
                        className="btn-small btn-secondary"
                        onClick={() => navigate(`/manager/planner/${session.planner_id}`)}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    case 'draft':
      return 'gray';
    default:
      return 'gray';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'confirmed':
      return 'Confirmed';
    case 'awaiting_planner_confirmation':
      return 'Awaiting Confirmation';
    case 'draft':
      return 'Draft';
    default:
      return status;
  }
};

export default ManagerDashboard;
