import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { formatDate } from '../../utils/dateHelpers';
import { useNavigate } from 'react-router-dom';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('MTD');
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    if (!profile?.id) return;

    const loadData = async () => {
      const dashboardData = await dashboardService.getManagerDashboard(profile.id);
      setData(dashboardData);
      setLoading(false);
    };

    loadData();
  }, [profile?.id]);

  const filterDataByDateRange = (sessions) => {
    if (!sessions) return [];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return sessions.filter(session => {
      const sessionDate = new Date(session.coaching_date);
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

  const handleMetricClick = (metricType) => {
    console.log(`Navigating to ${metricType} details`);
  };

  const handleStartCoachingSession = () => {
    navigate('/manager/coaching-form');
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No data</div>;
  }

  const filteredSessions = filterDataByDateRange(data.sessions);
  const rowsOptions = generateRowsOptions(Math.max(data.planners?.length || 0, filteredSessions.length));
  const plannersNotCoached = Math.max(0, (data.stats.totalPlanners || 0) - (data.stats.plannersCoached || 0));
  
  const managerCoachingPending = data.managerCoachingSessions?.filter(s => s.status === 'pending') || [];

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <p className="header-subtitle">1SANG BANYUHAY FINANCIAL GROUP</p>
          <h1 className="header-title">COACHING DASHBOARD</h1>
        </div>
        <div className="header-date">{formatHeaderDate()}</div>
      </div>

      {managerCoachingPending.length > 0 && (
        <div className="alert-card">
          <div className="alert-header">
            <div className="alert-icon">!</div>
            <div className="alert-content">
              <div className="alert-title">Coaching Acknowledgement Required</div>
              <div className="alert-message">
                You have {managerCoachingPending.length} coaching session{managerCoachingPending.length !== 1 ? 's' : ''} pending acknowledgement from your Senior Manager.
              </div>
            </div>
          </div>
          <button className="alert-action-btn">Review Now</button>
        </div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Planners on Team</div>
          <button 
            onClick={() => handleMetricClick('planners')}
            className="metric-value-btn"
          >
            {data.stats.totalPlanners || 0}
          </button>
          <div className="metric-detail">active development</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Coaching Sessions {dateRange}</div>
          <button 
            onClick={() => handleMetricClick('coaching-sessions')}
            className="metric-value-btn"
          >
            {filteredSessions.length}
          </button>
          <div className="metric-detail">confirmed & acknowledged</div>
        </div>

        <div className={`metric-card ${plannersNotCoached > 0 ? 'metric-alert' : ''}`}>
          <div className="metric-label">Planners Not Yet Coached</div>
          <button 
            onClick={() => handleMetricClick('coaching-gaps')}
            className="metric-value-btn"
          >
            {plannersNotCoached}
          </button>
          <div className="metric-detail">less than 2 confirmed sessions</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Avg Team Competency</div>
          <button 
            onClick={() => handleMetricClick('competency')}
            className="metric-value-btn"
          >
            —
          </button>
          <div className="metric-detail">on 1-4 scale</div>
        </div>
      </div>

      {managerCoachingPending.length > 0 && (
        <div className="card card-highlight">
          <h2 className="section-title">COACHING FOR YOU FROM SENIOR MANAGER</h2>

          <div className="filter-controls">
            <div className="filter-group">
              <label>Show:</label>
              <select className="filter-select">
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Topic</th>
                <th>Coaching Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {managerCoachingPending.map((session) => (
                <tr key={session.id}>
                  <td><strong>{session.from_name || 'Senior Manager'}</strong></td>
                  <td className="topic-name">{session.topic || 'Leadership Development'}</td>
                  <td>{formatDate(session.coaching_date)}</td>
                  <td>
                    <span className="status-badge status-pending">Pending</span>
                  </td>
                  <td>
                    <button className="action-btn">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2 className="section-title">COACHING SESSIONS WITH PLANNERS</h2>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Period:</label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="filter-select"
            >
              <option value="MTD">MTD</option>
              <option value="QTD">QTD</option>
              <option value="YTD">YTD</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Show:</label>
            <select 
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
              className="filter-select"
            >
              {rowsOptions.map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.slice(0, rowsPerPage).map((session) => (
                <tr key={session.id}>
                  <td><strong>{session.planner_name || 'Planner'}</strong></td>
                  <td className="topic-name">{session.topic || 'General'}</td>
                  <td>{formatDate(session.coaching_date)}</td>
                  <td>
                    <span className={`status-badge ${session.status === 'acknowledged' ? 'status-acknowledged' : 'status-pending'}`}>
                      {session.status === 'acknowledged' ? 'Acknowledged' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No coaching sessions in {dateRange}</div>
        )}

        <button className="cta-button" onClick={handleStartCoachingSession}>+ Start New Coaching Session</button>
      </div>

      <div className="card">
        <h2 className="section-title">TEAM OVERVIEW</h2>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Show:</label>
            <select 
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
              className="filter-select"
            >
              {rowsOptions.map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        {data.planners && data.planners.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Planner</th>
                <th>Status</th>
                <th>Sessions {dateRange}</th>
                <th>Last Coached</th>
                <th>Next Action</th>
              </tr>
            </thead>
            <tbody>
              {data.planners.slice(0, rowsPerPage).map((planner) => (
                <tr key={planner.id}>
                  <td><strong>{planner.first_name} {planner.last_name}</strong></td>
                  <td>
                    <span className="status-badge status-coaching">Active Development</span>
                  </td>
                  <td>{filteredSessions.filter(s => s.planner_id === planner.id).length}</td>
                  <td>—</td>
                  <td>Schedule coaching session</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No planners on team yet</div>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
