import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { formatDate } from '../../utils/dateHelpers';
import { useNavigate } from 'react-router-dom';
import SummaryModal from '../Layout/SummaryModal';
import './ManagerDashboard.css';

const COMPETENCY_LABELS = ['Need Coaching', 'Developing', 'Competent', 'Proficient'];

const competencyLabel = (level) => {
  if (!level) return '—';
  const rounded = Math.round(level);
  return COMPETENCY_LABELS[Math.min(Math.max(rounded, 1), 4) - 1];
};

const SeniorManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('MTD');
  const [sessionsRowsPerPage, setSessionsRowsPerPage] = useState(20);
  const [activeCard, setActiveCard] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const dashboardData = await dashboardService.getSeniorManagerDashboard(user.id);
    setData(dashboardData);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filterDataByDateRange = (sessions) => {
    if (!sessions) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return sessions.filter((session) => {
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
  const stats = data.stats || {};
  const buckets = data.buckets || { needCoaching: [], acknowledged: [], completed: [] };

  const plannerRows = (entries) =>
    entries.map((entry) => ({
      id: entry.planner.id,
      name: entry.planner.full_name,
      branch: entry.planner.branch || '—',
      sessions: entry.records.length,
    }));

  const plannerColumns = [
    { key: 'name', label: 'Planner' },
    { key: 'branch', label: 'Branch' },
    { key: 'sessions', label: 'Sessions' },
  ];

  const modals = {
    needCoaching: {
      title: 'Need Coaching',
      subtitle: 'Planners org-wide with 0-1 coaching session so far',
      columns: plannerColumns,
      rows: plannerRows(buckets.needCoaching),
      emptyMessage: 'Every planner has at least 2 sessions',
    },
    acknowledged: {
      title: 'Acknowledged',
      subtitle: 'Planners actively being coached (2+ sessions, cycle not yet complete)',
      columns: plannerColumns,
      rows: plannerRows(buckets.acknowledged),
      emptyMessage: 'No planners in this group yet',
    },
    completed: {
      title: 'Completed',
      subtitle: 'Planners who finished a full coaching cycle',
      columns: plannerColumns,
      rows: plannerRows(buckets.completed),
      emptyMessage: 'No completed cycles yet',
    },
    competency: {
      title: 'Organization Competency',
      subtitle: 'Every rated coaching session behind the organization average',
      columns: [
        { key: 'planner_name', label: 'Planner' },
        { key: 'topic', label: 'Topic' },
        { key: 'level', label: 'Level', render: (row) => competencyLabel(row.competency_level) },
      ],
      rows: [...buckets.needCoaching, ...buckets.acknowledged, ...buckets.completed]
        .flatMap((e) => e.records.map((r) => ({ ...r, planner_name: e.planner.full_name })))
        .filter((r) => r.competency_level),
      emptyMessage: 'No competency ratings recorded yet',
    },
    totalPlanners: {
      title: 'Total Planners in Organization',
      subtitle: 'Everyone registered with the planner role',
      columns: [{ key: 'name', label: 'Planner' }, { key: 'branch', label: 'Branch' }],
      rows: [...buckets.needCoaching, ...buckets.acknowledged, ...buckets.completed].map((e) => ({
        id: e.planner.id,
        name: e.planner.full_name,
        branch: e.planner.branch || '—',
      })),
      emptyMessage: 'No planners registered yet',
    },
  };

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
          <div className="metric-label">Need Coaching</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('needCoaching')}>
            {stats.needCoaching || 0}
          </button>
          <div className="metric-detail">planners with 0-1 session</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Acknowledged</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('acknowledged')}>
            {stats.acknowledged || 0}
          </button>
          <div className="metric-detail">planners acknowledged</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Completed</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('completed')}>
            {stats.completed || 0}
          </button>
          <div className="metric-detail">planners, full cycle</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Competency</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('competency')}>
            {stats.avgCompetency ? stats.avgCompetency.toFixed(1) : '—'}
          </button>
          <div className="metric-detail">team average, 1-4 scale</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Planners</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('totalPlanners')}>
            {stats.totalPlanners || 0}
          </button>
          <div className="metric-detail">in organization</div>
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
            <select
              value={sessionsRowsPerPage}
              onChange={(e) => setSessionsRowsPerPage(parseInt(e.target.value, 10))}
              className="filter-select"
            >
              {sessionRowsOptions.map((num) => (
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
              </tr>
            </thead>
            <tbody>
              {filteredSessions.slice(0, sessionsRowsPerPage).map((session) => (
                <tr key={session.id}>
                  <td><strong>{session.planner_name}</strong></td>
                  <td className="topic-name">{session.topic || 'General'}</td>
                  <td>{formatDate(session.created_at)}</td>
                  <td>
                    <span className={`status-badge ${session.status === 'acknowledged' ? 'status-acknowledged' : session.status === 'coaching_complete' ? 'status-coaching' : 'status-pending'}`}>
                      {session.status === 'coaching_complete' ? 'Completed' : session.status === 'acknowledged' ? 'Acknowledged' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No coaching sessions in {dateRange}</div>
        )}

        <button type="button" className="cta-button" onClick={() => navigate('/manager/coaching/start')}>
          + START NEW COACHING SESSION
        </button>
      </div>

      {activeCard && (
        <SummaryModal
          title={modals[activeCard].title}
          subtitle={modals[activeCard].subtitle}
          columns={modals[activeCard].columns}
          rows={modals[activeCard].rows}
          emptyMessage={modals[activeCard].emptyMessage}
          onClose={() => setActiveCard(null)}
        />
      )}
    </div>
  );
};

export default SeniorManagerDashboard;
