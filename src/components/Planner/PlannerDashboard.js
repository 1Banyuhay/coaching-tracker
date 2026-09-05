import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService, acknowledgeCoachingRecord, followUpStatus } from '../../services/dashboardService';
import { formatDate } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';
import SummaryModal from '../Layout/SummaryModal';
import CoachingDetailModal from '../Layout/CoachingDetailModal';
import '../Manager/ManagerDashboard.css';

const COMPETENCY_LABELS = ['Need Coaching', 'Developing', 'Competent', 'Proficient'];

const competencyLabel = (level) => {
  if (!level) return '—';
  const rounded = Math.round(level);
  return COMPETENCY_LABELS[Math.min(Math.max(rounded, 1), 4) - 1];
};

const statusBadge = (status) => {
  if (status === 'coaching_complete') return <span className="status-badge status-coaching">Completed</span>;
  if (status === 'acknowledged') return <span className="status-badge status-acknowledged">Acknowledged</span>;
  return <span className="status-badge status-pending">Pending</span>;
};

const PlannerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [acknowledging, setAcknowledging] = useState(null);
  const [detailSession, setDetailSession] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const dashboardData = await dashboardService.getPlannerDashboard(user.id);
    setData(dashboardData);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatHeaderDate = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  const handleAcknowledge = async (recordId) => {
    setAcknowledging(recordId);
    try {
      await acknowledgeCoachingRecord(recordId);
      toast.success('Coaching acknowledged');
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

  const stats = data.stats || {};
  const records = data.records || [];

  const sessionColumns = [
    { key: 'coach_name', label: 'From' },
    { key: 'topic', label: 'Topic', render: (row) => row.topic || 'General' },
    { key: 'date', label: 'Date', render: (row) => formatDate(row.created_at) },
  ];

  const modals = {
    needAction: {
      title: 'Need Action',
      subtitle: 'Coaching from your Senior Manager or Manager, waiting on your acknowledgement',
      columns: [
        ...sessionColumns,
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
      rows: data.needActionSessions || [],
      emptyMessage: 'Nothing waiting on you',
    },
    acknowledged: {
      title: 'Acknowledged',
      subtitle: 'Coaching sessions you have acknowledged',
      columns: sessionColumns,
      rows: data.acknowledgedSessions || [],
      emptyMessage: 'No acknowledged sessions yet',
    },
    completed: {
      title: 'Completed',
      subtitle: 'Coaching sessions that finished a full cycle',
      columns: sessionColumns,
      rows: data.completedSessions || [],
      emptyMessage: 'No completed sessions yet',
    },
    competency: {
      title: 'Your Competency',
      subtitle: 'Every rated coaching session behind your average',
      columns: [
        { key: 'topic', label: 'Topic', render: (row) => row.topic || 'General' },
        { key: 'level', label: 'Level', render: (row) => competencyLabel(row.competency_level) },
      ],
      rows: records.filter((r) => r.competency_level),
      emptyMessage: 'No competency ratings recorded yet',
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
        <div className={`metric-card ${stats.needAction > 0 ? 'metric-alert' : ''}`}>
          <div className="metric-label">Need Action</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('needAction')}>
            {stats.needAction || 0}
          </button>
          <div className="metric-detail">from Senior Manager or Manager</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Acknowledged</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('acknowledged')}>
            {stats.acknowledged || 0}
          </button>
          <div className="metric-detail">sessions acknowledged</div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-label">Completed</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('completed')}>
            {stats.completed || 0}
          </button>
          <div className="metric-detail">full cycle sessions</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Competency</div>
          <button className="metric-value-btn" onClick={() => setActiveCard('competency')}>
            {stats.avgCompetency ? stats.avgCompetency.toFixed(1) : '—'}
          </button>
          <div className="metric-detail">your average, 1-4 scale</div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">YOUR COACHING HISTORY</h2>

        {records.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Topic</th>
                <th>Coaching Date</th>
                <th>Competency</th>
                <th>Status</th>
                <th>Follow-Up</th>
              </tr>
            </thead>
            <tbody>
              {records.map((session) => {
                const due = followUpStatus(session);
                return (
                  <tr key={session.id}>
                    <td><strong>{session.coach_name}</strong></td>
                    <td>
                      <button type="button" className="topic-link" onClick={() => setDetailSession(session)}>
                        {session.topic || 'General'}
                      </button>
                    </td>
                    <td>{formatDate(session.created_at)}</td>
                    <td>{competencyLabel(session.competency_level)}</td>
                    <td>{statusBadge(session.status)}</td>
                    <td>
                      {session.follow_up_date ? formatDate(session.follow_up_date) : '—'}
                      {due && <span className={`due-badge due-${due.level}`}>{due.label}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-data">No coaching sessions yet</div>
        )}
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

      {detailSession && (
        <CoachingDetailModal session={detailSession} recipientLabel="Planner" onClose={() => setDetailSession(null)} />
      )}
    </div>
  );
};

export default PlannerDashboard;
