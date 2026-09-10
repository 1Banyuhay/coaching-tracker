import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  dashboardService,
  categorizePlanners,
  filterRecordsByPeriod,
  countsTowardStats,
  isAcknowledgeExpired,
} from '../../services/dashboardService';
import { formatDate } from '../../utils/dateHelpers';
import { useNavigate } from 'react-router-dom';
import SummaryModal from '../Layout/SummaryModal';
import CoachingSessionsTable from '../Layout/CoachingSessionsTable';
import CoachingDetailModal from '../Layout/CoachingDetailModal';
import PlannerCoachingModal from '../Layout/PlannerCoachingModal';
import FollowUpBanner from '../Layout/FollowUpBanner';
import './ManagerDashboard.css';

const PERIOD_DESCRIPTIONS = {
  Current: 'this month so far',
  Previous: 'last month',
  QTD: 'this quarter so far',
  YTD: 'this year so far',
};

const COMPETENCY_LABELS = ['Need Coaching', 'Developing', 'Competent', 'Proficient'];

const competencyLabel = (level) => {
  if (!level) return '—';
  const rounded = Math.round(level);
  return COMPETENCY_LABELS[Math.min(Math.max(rounded, 1), 4) - 1];
};

// A record that ran out its 24-hour acknowledge window stays 'pending' in
// the database forever - it just displays as Expired instead of Pending.
const sessionStatusBadge = (session) => {
  if (isAcknowledgeExpired(session)) return <span className="status-badge status-expired">Expired</span>;
  if (session.status === 'coaching_complete') return <span className="status-badge status-coaching">Completed</span>;
  if (session.status === 'acknowledged') return <span className="status-badge status-acknowledged">Acknowledged</span>;
  return <span className="status-badge status-pending">Pending</span>;
};

const SeniorManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('Current');
  const [sessionsRowsPerPage, setSessionsRowsPerPage] = useState(20);
  const [managerSessionsRowsPerPage, setManagerSessionsRowsPerPage] = useState(20);
  const [activeCard, setActiveCard] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedPlanner, setSelectedPlanner] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const dashboardData = await dashboardService.getSeniorManagerDashboard(user.id);
    setData(dashboardData);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);


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

  const managersForPicker = [...(data.managers || [])].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const sessionsForPlanner = (plannerId) => (data.sessions || []).filter((s) => s.planner_id === plannerId);

  // Session-level counts and planner-level buckets both move together with
  // the period selector above the metrics grid, recomputed here from the
  // all-time data the service returned. Total Planners (roster count) stays
  // live/current regardless of period - see the discussion notes doc.
  //
  // periodRecords/periodManagerRecords stay unfiltered by acknowledge-
  // window expiry, so an expired session still shows up (flagged) in the
  // sessions tables below - countedPeriodRecords (expired excluded) is
  // what every stat/bucket number is built from.
  const periodRecords = filterRecordsByPeriod(data.sessions, dateRange);
  const countedPeriodRecords = periodRecords.filter(countsTowardStats);
  const sessionRowsOptions = generateRowsOptions(periodRecords.length);
  const periodManagerRecords = filterRecordsByPeriod(data.managerSessions, dateRange);
  const managerSessionRowsOptions = generateRowsOptions(periodManagerRecords.length);
  const periodBuckets = categorizePlanners(data.roster || [], countedPeriodRecords);
  const periodStats = {
    needCoaching: periodBuckets.needCoaching.length,
    totalSessions: countedPeriodRecords.length,
    acknowledged: countedPeriodRecords.filter((r) => r.status !== 'pending').length,
    completed: periodBuckets.completed.length,
    avgCompetency: periodBuckets.avgCompetency,
    totalPlanners: periodBuckets.totalPlanners,
    coachedAtLeastOnce: periodBuckets.coachedAtLeastOnce,
    pctCoached: periodBuckets.pctCoached,
  };

  // All-time, always-current roster rollup for the List of Planners tab -
  // independent of the period selector above. Defaults to the whole
  // branch; the manager picker narrows it to one manager's planners.
  const plannerSummaries = [...(data.plannerSummaries || [])]
    .filter((row) => !selectedManagerId || String(row.managerId) === String(selectedManagerId))
    .sort((a, b) => a.name.localeCompare(b.name));

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

  const sessionListColumns = [
    { key: 'planner_name', label: 'Planner' },
    { key: 'topic', label: 'Topic', render: (row) => row.topic || 'General' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.created_at) },
    { key: 'status', label: 'Status', render: (row) => sessionStatusBadge(row) },
  ];

  const modals = {
    needCoaching: {
      title: 'Need Coaching',
      subtitle: `Planners in your branch with 0-1 coaching session, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: plannerColumns,
      rows: plannerRows(periodBuckets.needCoaching),
      emptyMessage: 'Every planner has at least 2 sessions in this period',
    },
    totalSessions: {
      title: 'Coaching Sessions',
      subtitle: `Every coaching session logged with a planner in your branch, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: sessionListColumns,
      rows: countedPeriodRecords,
      emptyMessage: 'No coaching sessions logged in this period',
    },
    acknowledged: {
      title: 'Acknowledged',
      subtitle: `Sessions your planners have acted on - acknowledged or completed a full cycle, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: sessionListColumns,
      rows: countedPeriodRecords.filter((s) => s.status !== 'pending'),
      emptyMessage: 'No sessions acknowledged in this period',
    },
    completed: {
      title: 'Completed',
      subtitle: `Planners who finished a full coaching cycle, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: plannerColumns,
      rows: plannerRows(periodBuckets.completed),
      emptyMessage: 'No completed cycles in this period',
    },
    competency: {
      title: 'Branch Competency',
      subtitle: `Every rated coaching session behind your branch average, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: [
        { key: 'planner_name', label: 'Planner' },
        { key: 'topic', label: 'Topic' },
        { key: 'level', label: 'Level', render: (row) => competencyLabel(row.competency_level) },
      ],
      rows: countedPeriodRecords.filter((r) => r.competency_level),
      emptyMessage: 'No competency ratings recorded in this period',
    },
    totalPlanners: {
      title: 'Total Planners in Your Branch',
      subtitle: 'Everyone reporting to a manager in your branch, regardless of period',
      columns: [{ key: 'name', label: 'Planner' }, { key: 'branch', label: 'Branch' }],
      rows: (data.roster || []).map((planner) => ({
        id: planner.id,
        name: planner.full_name,
        branch: planner.branch || '—',
      })),
      emptyMessage: 'No planners registered yet',
    },
  };

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <p className="header-subtitle">1Sang Banyuhay Financial Group</p>
          <h1 className="header-title">COACHING DASHBOARD</h1>
        </div>
        <div className="header-date">{formatHeaderDate()}</div>
      </div>

      <FollowUpBanner sessions={[...(data.sessions || []), ...(data.managerSessions || [])]} />

      <div className="dashboard-tabs">
        <button
          type="button"
          className={`dashboard-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Branch Overview
        </button>
        <button
          type="button"
          className={`dashboard-tab ${activeTab === 'byPlanners' ? 'active' : ''}`}
          onClick={() => setActiveTab('byPlanners')}
        >
          List of Planners
        </button>
      </div>

      {activeTab === 'overview' && (
      <>
      <div className="card period-selector-card">
        <div className="filter-controls" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <label>Period:</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="filter-select">
              <option value="Current">Current</option>
              <option value="Previous">Previous</option>
              <option value="QTD">QTD</option>
              <option value="YTD">YTD</option>
            </select>
          </div>
          <div className="period-description">Showing the cards and sessions below for {PERIOD_DESCRIPTIONS[dateRange]}</div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Need Coaching</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('needCoaching')}>
            {periodStats.needCoaching || 0}
          </button>
          <div className="metric-detail">{`planners with 0-1 session, ${PERIOD_DESCRIPTIONS[dateRange]}`}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Coaching Sessions</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('totalSessions')}>
            {periodStats.totalSessions || 0}
          </button>
          <div className="metric-detail">{`logged, ${PERIOD_DESCRIPTIONS[dateRange]}`}</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Acknowledged</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('acknowledged')}>
            {periodStats.acknowledged || 0}
          </button>
          <div className="metric-detail">{`sessions acknowledged, ${PERIOD_DESCRIPTIONS[dateRange]}`}</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Completed</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('completed')}>
            {periodStats.completed || 0}
          </button>
          <div className="metric-detail">{`planners, full cycle, ${PERIOD_DESCRIPTIONS[dateRange]}`}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Competency</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('competency')}>
            {periodStats.avgCompetency ? periodStats.avgCompetency.toFixed(1) : '—'}
          </button>
          <div className="metric-detail">{`team average, 1-4 scale, ${PERIOD_DESCRIPTIONS[dateRange]}`}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Planners</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('totalPlanners')}>
            {periodStats.totalPlanners || 0}
          </button>
          <div className="metric-detail">
            {periodStats.totalPlanners
              ? `${periodStats.coachedAtLeastOnce || 0} of ${periodStats.totalPlanners} (${periodStats.pctCoached}%) coached at least once, ${PERIOD_DESCRIPTIONS[dateRange]}`
              : 'in your branch'}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">COACHING SESSIONS WITH MANAGERS</h2>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Show:</label>
            <select
              value={managerSessionsRowsPerPage}
              onChange={(e) => setManagerSessionsRowsPerPage(parseInt(e.target.value, 10))}
              className="filter-select"
            >
              {managerSessionRowsOptions.map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        <CoachingSessionsTable
          sessions={periodManagerRecords.slice(0, managerSessionsRowsPerPage)}
          recipientLabel="Manager"
          onSelectTopic={setDetailSession}
          onLogFollowUp={(session) => navigate('/manager/coaching/start', { state: { followUpFrom: session, recipientLabel: 'Manager' } })}
          emptyMessage={`No coaching sessions with managers, ${PERIOD_DESCRIPTIONS[dateRange]}`}
        />

        <button
          type="button"
          className="cta-button"
          onClick={() => navigate('/manager/coaching/start', { state: { recipientType: 'manager' } })}
        >
          + START NEW COACHING SESSION
        </button>
      </div>

      <div className="card">
        <h2 className="section-title">COACHING SESSIONS WITH PLANNERS</h2>

        <div className="filter-controls">
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

        <CoachingSessionsTable
          sessions={periodRecords.slice(0, sessionsRowsPerPage)}
          recipientLabel="Planner"
          coachColumnLabel="Manager"
          onSelectTopic={setDetailSession}
          onLogFollowUp={(session) => navigate('/manager/coaching/start', { state: { followUpFrom: session, recipientLabel: 'Planner' } })}
          emptyMessage={`No coaching sessions, ${PERIOD_DESCRIPTIONS[dateRange]}`}
        />

        <button type="button" className="cta-button" onClick={() => navigate('/manager/coaching/start')}>
          + START NEW COACHING SESSION
        </button>
      </div>
      </>
      )}

      {activeTab === 'byPlanners' && (
        <div className="card">
          <h2 className="section-title">LIST OF PLANNERS</h2>
          <p className="period-description" style={{ marginBottom: '1.25rem' }}>All-time totals for every planner in your branch, regardless of the period selector on Branch Overview.</p>

          <div className="filter-controls">
            <div className="filter-group">
              <label>Manager:</label>
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="filter-select"
              >
                <option value="">All Managers</option>
                {managersForPicker.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {plannerSummaries.length === 0 ? (
            <div className="no-data">No planners reporting to this manager yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Planner</th>
                  <th>Manager</th>
                  <th>Branch</th>
                  <th>Sessions</th>
                  <th>Acknowledged</th>
                  <th>Completed</th>
                  <th>Avg Competency</th>
                  <th>Most Recent Coaching Date</th>
                </tr>
              </thead>
              <tbody>
                {plannerSummaries.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="topic-link" onClick={() => setSelectedPlanner(row)}>
                        {row.name}
                      </button>
                    </td>
                    <td>{row.managerName || '—'}</td>
                    <td>{row.branch || '—'}</td>
                    <td>{row.totalSessions}</td>
                    <td>{row.acknowledged}</td>
                    <td>{row.completed}</td>
                    <td>{row.avgCompetency ? row.avgCompetency.toFixed(1) : '—'}</td>
                    <td>{row.mostRecentDate ? formatDate(row.mostRecentDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedPlanner && (
        <PlannerCoachingModal
          planner={{ id: selectedPlanner.id, full_name: selectedPlanner.name, branch: selectedPlanner.branch }}
          sessions={sessionsForPlanner(selectedPlanner.id)}
          coachColumnLabel="Manager"
          onSelectTopic={setDetailSession}
          onStartSession={() => navigate('/manager/coaching/start')}
          onClose={() => setSelectedPlanner(null)}
        />
      )}

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

      {detailSession && (
        <CoachingDetailModal
          session={detailSession}
          recipientLabel={data.managerSessions?.some((s) => s.id === detailSession.id) ? 'Manager' : 'Planner'}
          onClose={() => setDetailSession(null)}
        />
      )}
    </div>
  );
};

export default SeniorManagerDashboard;
