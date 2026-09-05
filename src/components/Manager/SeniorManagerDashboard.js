import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { formatDate } from '../../utils/dateHelpers';
import { useNavigate } from 'react-router-dom';
import './ManagerDashboard.css';

const SeniorManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('MTD');
  const [sessionsRowsPerPage, setSessionsRowsPerPage] = useState(20);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      const dashboardData = await dashboardService.getSeniorManagerDashboard(user.id);
      setData(dashboardData);
      setLoading(false);
    };

    loadData();
  }, [user?.id]);

  const filterDataByDateRange = (sessions) => {
    if (!sessions) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return sessions.filter(session => {
      const sessionDate = new Date(session.created_at);
      const sessionYear = sessionDate.getFullYear();
      const sessionMonth = sessionDate.getMonth();
      const sessionQuarter = Math.floor(sessionMonth / 3);

      switch (dateRange) {
        case 'MTD':
          return sessionYear === currentYear && sessionMonth === currentMonth;
        case 'QTD':
          return sessionYear === currentYear && sessionQuarter === currentQuarter;
        case 'YTD':
          return sessionYear === currentYear;
        default:
          return true;
      }
    });
  };

  const generateRowsOptions = (maxRows) => {
    const options = [20, 30, 40, 50, 100];
    if (maxRows > 100) {
      for (let i = 150; i <= maxRows; i += 50) {
        options.push(i);
      }
      if (!options.includes(maxRows)) {
        options.push(maxRows);
      }
    }
    return options.sort((a, b) => a - b);
  };

  const formatHeaderDate = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No data</div>;
  }

  const filteredSessions = filterDataByDateRange(data.sessions);
  const sessionRowsOptions = generateRowsOptions(filteredSessions.length);

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="header-title">COACHING DASHBOARD</h1>
        </div>
        <div className="header-date">{formatHeaderDate()}</div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Planners in Organization</div>
          <button className="metric-value-btn" onClick={() => console.log('View planners')}>{data.stats.totalPlannersInOrg || 0}</button>
          <div className="metric-detail">across all branches</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Coaching Sessions {dateRange}</div>
          <button className="metric-value-btn" onClick={() => console.log('View sessions')}>{filteredSessions.length}</button>
          <div className="metric-detail">confirmed & acknowledged</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Avg Team Competency</div>
          <button className="metric-value-btn">—</button>
          <div className="metric-detail">on 1-4 scale</div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">COACHING SESSIONS WITH PLANNERS</h2>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Period:</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="filter-select">
              <option value="MTD">MTD</option>
              <option value="QTD">QTD</option>
              <option value="YTD">YTD</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Show:</label>
            <select value={sessionsRowsPerPage} onChange={(e) => setSessionsRowsPerPage(parseInt(e.target.value))} className="filter-select">
              {sessionRowsOptions.map(num => <option key={num} value={num}>{num}</option>)}
            </select>
          </div>
        </div>

        {filteredSessions.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Planner</th>
                <th>Topic</th>
                <th>Coaching Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.slice(0, sessionsRowsPerPage).map((session) => (
                <tr key={session.id}>
                  <td><strong>{session.planner_name || 'Planner'}</strong></td>
                  <td className="topic-name">{session.topic || 'General'}</td>
                  <td>{formatDate(session.created_at)}</td>
                  <td><span className={`status-badge ${session.status === 'acknowledged' ? 'status-acknowledged' : 'status-pending'}`}>{session.status === 'acknowledged' ? 'Acknowledged' : 'Pending'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No coaching sessions in {dateRange}</div>
        )}

        <button
          type="button"
          className="cta-button"
          onClick={() => navigate('/manager/coaching/start')}
        >
          + START NEW COACHING SESSION
        </button>
      </div>
    </div>
  );
};

export default SeniorManagerDashboard;
