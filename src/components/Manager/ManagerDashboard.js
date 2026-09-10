import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  dashboardService,
  acknowledgeCoachingRecord,
  categorizePlanners,
  filterRecordsByPeriod,
} from '../../services/dashboardService';
import { formatDate } from '../../utils/dateHelpers';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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

const sessionStatusBadge = (status) => {
  if (status === 'coaching_complete') return <span className="status-badge status-coaching">Completed</span>;
  if (status === 'acknowledged') return <span className="status-badge status-acknowledged">Acknowledged</span>;
  return <span className="status-badge status-pending">Pending</span>;
};

const ManagerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState('Current');
  const [sessionsRowsPerPage, setSessionsRowsPerPage] = useState(20);
  const [activeCard, setActiveCard] = useState(null);
  const [acknowledging, setAcknowledging] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlanner, setSelectedPlanner] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const dashboardData = await dashboardService.getManagerDashboard(user.id);
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

  const handleAcknowledge = async (recordId) => {
    setAcknowledging(recordId);
    try {
      const { closedCycle } = await acknowledgeCoachingRecord(recordId);
      toast.success(closedCycle ? 'Coaching acknowledged - cycle closed' : 'Coaching acknowledged');
      await loadData();
      setActiveCard(null);
    } catch (error) {
      console.error('Error acknowledging coaching record:', error);
      toast.error('Could not acknowledge that session');
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>No data</div>;
  }

  // Session-level counts and planner-level buckets both move together with
  // the period selector above the metrics grid - recomputed here from the
  // all-time data the service returned, rather than a second round-trip.
  // Need Action and the Total Planners roster count stay live/current
  // regardless of period (see the discussion notes doc).
  const periodRecords = filterRecordsByPeriod(data.sessions, dateRange);
  const sessionRowsOptions = generateRowsOptions(periodRecords.length);
  const stats = data.stats || {};
  const periodBuckets = categorizePlanners(data.roster || [], periodRecords);
  const periodStats = {
    needAction: stats.needAction,
    needCoaching: periodBuckets.needCoaching.length,
    totalSessions: periodRecords.length,
    acknowledged: periodRecords.filter((r) => r.status !== 'pending').length,
    completed: periodBuckets.completed.length,
    avgCompetency: periodBuckets.avgCompetency,
    totalPlanners: periodBuckets.totalPlanners,
    coachedAtLeastOnce: periodBuckets.coachedAtLeastOnce,
    pctCoached: periodBuckets.pctCoached,
  };
  const plannerSummaries = [...(data.plannerSummaries || [])].sort((a, b) => a.name.localeCompare(b.name));

  const plannerRows = (entries) =>
    entries.map((entry) => ({
      id: entry.planner.id,
      name: entry.planner.full_name,
      branch: entry.planner.branch || '—',
      sessions: entry.records.length,
    }));

  const plannerColumns = [
    { key: 'name', label: 'Planner' },
    { key: 'sessions', label: 'Sessions' },
  ];

  const sessionsForPlanner = (plannerId) => (data.sessions || []).filter((s) => s.planner_id === plannerId);

  const needActionRows = (data.needActionSessions || []).map((s) => ({
    id: s.id,
    from: s.coach_name,
    topic: s.topic || 'General',
    date: formatDate(s.created_at),
    status: s.status,
  }));

  const sessionListColumns = [
    { key: 'planner_name', label: 'Planner' },
    { key: 'topic', label: 'Topic', render: (row) => row.topic || 'General' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.created_at) },
    { key: 'status', label: 'Status', render: (row) => sessionStatusBadge(row.status) },
  ];

  const modals = {
    needAction: {
      title: 'Need Action',
      subtitle: 'Coaching your Senior Manager sent you, waiting on your acknowledgement',
      columns: [
        { key: 'from', label: 'From' },
        { key: 'topic', label: 'Topic' },
        { key: 'date', label: 'Date' },
        {
          key: 'action',
          label: '',
          render: (row) => (
            <button
              className="ack-btn"
              disabled={acknowledging === row.id}
              onClick={() => handleAcknowledge(row.id)}
            >
              {acknowledging === row.id ? 'Saving...' : 'Acknowledge'}
            </button>
          ),
        },
      ],
      rows: needActionRows,
      emptyMessage: 'Nothing waiting on you',
    },
    needCoaching: {
      title: 'Need Coaching',
      subtitle: `Planners with 0-1 coaching session, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: plannerColumns,
      rows: plannerRows(periodBuckets.needCoaching),
      emptyMessage: 'Everyone on your team has at least 2 sessions in this period',
    },
    totalSessions: {
      title: 'Coaching Sessions',
      subtitle: `Every coaching session you have logged with a planner, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: sessionListColumns,
      rows: periodRecords,
      emptyMessage: 'No coaching sessions logged in this period',
    },
    acknowledged: {
      title: 'Acknowledged',
      subtitle: `Sessions your planners have acted on - acknowledged or completed a full cycle, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: sessionListColumns,
      rows: periodRecords.filter((s) => s.status !== 'pending'),
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
      title: 'Team Competency',
      subtitle: `Every rated coaching session behind your team average, ${PERIOD_DESCRIPTIONS[dateRange]}`,
      columns: [
        { key: 'planner_name', label: 'Planner' },
        { key: 'topic', label: 'Topic' },
        { key: 'level', label: 'Level', render: (row) => competencyLabel(row.competency_level) },
      ],
      rows: periodRecords.filter((s) => s.competency_level),
      emptyMessage: 'No competency ratings recorded in this period',
    },
    totalPlanners: {
      title: 'Total Planners in Your Team',
      subtitle: 'Everyone currently on your team, regardless of period',
      columns: [{ key: 'name', label: 'Planner' }, { key: 'branch', label: 'Branch' }],
      rows: (data.roster || []).map((planner) => ({
        id: planner.id,
        name: planner.full_name,
        branch: planner.branch || '—',
      })),
      emptyMessage: 'No planners on your team yet',
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

      <FollowUpBanner sessions={data.sessions} />

      <div className="dashboard-tabs">
        <button
          type="button"
          className={`dashboard-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`dashboard-tab ${activeTab === 'plannerSummary' ? 'active' : ''}`}
          onClick={() => setActiveTab('plannerSummary')}
        >
          Planner Summary
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
        <div className={`metric-card ${stats.needAction > 0 ? 'metric-alert' : ''}`}>
          <div className="metric-label">Need Action</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('needAction')}>
            {stats.needAction || 0}
          </button>
          <div className="metric-detail">from your Senior Manager</div>
        </div>

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
              : 'in your team'}
          </div>
        </div>
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

      {activeTab === 'plannerSummary' && (
        <div className="card">
          <h2 className="section-title">PLANNER SUMMARY</h2>
          <p className="period-description" style={{ marginBottom: '1.25rem' }}>All-time totals for every planner on your team, regardless of the period selector on Overview.</p>

          {plannerSummaries.length === 0 ? (
            <div className="no-data">No planners on your team yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Planner</th>
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
        <CoachingDetailModal session={detailSession} recipientLabel="Planner" onClose={() => setDetailSession(null)} />
      )}
    </div>
  );
};

export default ManagerDashboard;
