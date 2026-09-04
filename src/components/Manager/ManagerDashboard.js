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
  const [sessionsRowsPerPage, setSessionsRowsPerPage] = useState(20);
  const [teamRowsPerPage, setTeamRowsPerPage] = useState(20);

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

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No data</div>;
  }

  const filteredSessions = filterDataByDateRange(data.sessions);
  const sessionRowsOptions = generateRowsOptions(Math.max(data.planners?.length || 0, filteredSessions.length));
  const teamRowsOptions = generateRowsOptions(data.planners?.length || 0);
  const plannersNotCoached = Math.max(0, (data.stats.totalPlanners || 0) - (data.stats.plannersCoached || 0));
  const managerCoachingPending = data.managerCoachingSessions || [];

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
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
                You have {managerCoachingPending.length} coaching session{managerCoachingPending.length !== 1 ? 's' : ''} pending acknowledgement.
              </div>
            </div>
          </div>
          <button className="alert-action-btn">Review Now</button>
        </div>
      )}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Planners on Team</div>
          <button className="metric-value-btn" onClick={() => console.log('View planners')}>{data.stats.totalPlanners || 0}</button>
          <div className="metric-detail">active development</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Coaching Sessions {dateRange}</div>
          <button className="metric-value-btn" onClick={() => console.log('View sessions')}>{filteredSessions.length}</button>
          <div className="metric-detail">confirmed & acknowledged</div>
        </div>

        <div className={`metric-card ${plannersNotCoached > 0 ? 'metric-alert' : ''}`}>
          <div className="metric-label">Planners Not Yet Coached</div>
          <button className="metric-value-btn" onClick={() => console.log('View coaching gaps')}>{plannersNotCoached}</button>
          <div className="metric-detail">less than 2 confirmed sessions</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Avg Team Competency</div>
          <button className="metric-value-btn">—</button>
          <div className="metric-detail">on 1-4 scale</div>
        </div>
      </div>

      <div className="card card-highlight">
        <h2 className="section-title">COACHING FROM SENIOR MANAGER</h2>

        {managerCoachingPending.length > 0 ? (
          <>
            <div className="filter-controls">
              <div className="filter-group">
                <label>Show:</label>
                <select value={teamRowsPerPage} onChange={(e) => setTeamRowsPerPage(parseInt(e.target.value))} className="filter-select">
                  {[10, 20, 50, 100].map(num => <option key={num} value={num}>{num}</option>)}
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
                </tr>
              </thead>
              <tbody>
                {managerCoachingPending.slice(0, teamRowsPerPage).map((session) => (
                  <tr key={session.id}>
                    <td><strong>Senior Manager</strong></td>
                    <td className="topic-name">{session.topic || 'Leadership Development'}</td>
                    <td>{formatDate(session.coaching_date)}</td>
                    <td><span className="status-badge status-pending">{session.status === 'pending' ? 'Pending' : 'Acknowledged'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="no-data">No coaching sessions from your Senior Manager</div>
        )}
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
                  <td>{formatDate(session.coaching_date)}</td>
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

      <div className="card">
        <h2 className="section-title">TEAM OVERVIEW</h2>
        <div className="filter-controls">
          <div className="filter-group">
            <label>Show:</label>
            <select value={teamRowsPerPage} onChange={(e) => setTeamRowsPerPage(parseInt(e.target.value))} className="filter-select">
              {teamRowsOptions.map(num => <option key={num} value={num}>{num}</option>)}
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
              </tr>
            </thead>
            <tbody>
              {data.planners.slice(0, teamRowsPerPage).map((planner) => (
                <tr key={planner.id}>
                  <td><strong>{planner.first_name} {planner.last_name}</strong></td>
                  <td><span className="status-badge status-coaching">Active Development</span></td>
                  <td>{filteredSessions.filter(s => s.planner_id === planner.id).length}</td>
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
