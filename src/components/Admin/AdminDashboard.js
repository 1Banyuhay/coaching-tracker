import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminOrgSummary } from '../../services/adminDashboardService';
import '../Manager/ManagerDashboard.css';
import './Admin.css';

const COMPETENCY_LABELS = ['Need Coaching', 'Developing', 'Competent', 'Proficient'];

const competencyLabel = (level) => {
  if (!level) return '—';
  const rounded = Math.round(level);
  return COMPETENCY_LABELS[Math.min(Math.max(rounded, 1), 4) - 1];
};

const statusBadge = (status) => (
  <span className={`status-badge ${status === 'active' ? 'status-acknowledged' : 'status-pending'}`}>
    {status === 'active' ? 'Active' : 'Inactive'}
  </span>
);

// Org-wide view for Admin: a summary of every Senior Manager's branch, and
// every Manager underneath them, for easy reference - Admin sits above
// every branch rather than being scoped to just one.
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadData = useCallback(async () => {
    const summary = await getAdminOrgSummary();
    setData(summary);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatHeaderDate = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  if (loading || !data) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  const { totals, seniorManagerSummaries, managerSummaries } = data;

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="header-title">ADMINISTRATION DASHBOARD</h1>
        </div>
        <div className="header-date">{formatHeaderDate()}</div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Senior Managers</div>
          <div className="metric-value-btn" style={{ cursor: 'default' }}>{totals.seniorManagers}</div>
          <div className="metric-detail">branches</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Managers</div>
          <div className="metric-value-btn" style={{ cursor: 'default' }}>{totals.managers}</div>
          <div className="metric-detail">org-wide</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Planners</div>
          <div className="metric-value-btn" style={{ cursor: 'default' }}>{totals.planners}</div>
          <div className="metric-detail">org-wide</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Competency</div>
          <div className="metric-value-btn" style={{ cursor: 'default' }}>
            {totals.avgCompetency ? totals.avgCompetency.toFixed(1) : '—'}
          </div>
          <div className="metric-detail">org average, 1-4 scale</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Sessions</div>
          <div className="metric-value-btn" style={{ cursor: 'default' }}>{totals.totalSessions}</div>
          <div className="metric-detail">coaching records logged</div>
        </div>
      </div>

      <div className="quick-links">
        <button type="button" className="quick-link-card" onClick={() => navigate('/manager/coaching/start')}>
          <h3>Start Coaching</h3>
          <p>Log a coaching session with a manager or planner</p>
        </button>
        <button type="button" className="quick-link-card" onClick={() => navigate('/senior-manager/team')}>
          <h3>Manage Team</h3>
          <p>Add people, promote, reset passwords, assign reporting lines</p>
        </button>
        <button type="button" className="quick-link-card" onClick={() => navigate('/links')}>
          <h3>Useful Links</h3>
          <p>Add or edit the links shown on every dashboard</p>
        </button>
        <button type="button" className="quick-link-card" onClick={() => navigate('/admin/library')}>
          <h3>Coaching Topics</h3>
          <p>Add or edit topics, and choose who can use each one</p>
        </button>
      </div>

      <div className="card">
        <h2 className="section-title">SENIOR MANAGERS</h2>
        {seniorManagerSummaries.length === 0 ? (
          <div className="no-data">No Senior Managers yet</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Senior Manager</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Managers</th>
                <th>Planners</th>
                <th>Coached At Least Once</th>
                <th>Sessions</th>
                <th>Avg Competency</th>
              </tr>
            </thead>
            <tbody>
              {seniorManagerSummaries.map((sm) => (
                <tr key={sm.id}>
                  <td><strong>{sm.name}</strong></td>
                  <td>{sm.branch || '—'}</td>
                  <td>{statusBadge(sm.status)}</td>
                  <td>{sm.totalManagers}</td>
                  <td>{sm.totalPlanners}</td>
                  <td>
                    {sm.totalPlanners ? `${sm.coachedAtLeastOnce} of ${sm.totalPlanners} (${sm.pctCoached}%)` : '—'}
                  </td>
                  <td>{sm.totalSessions}</td>
                  <td>{competencyLabel(sm.avgCompetency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="section-title">MANAGERS</h2>
        {managerSummaries.length === 0 ? (
          <div className="no-data">No Managers yet</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Manager</th>
                <th>Senior Manager</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Planners</th>
                <th>Coached At Least Once</th>
                <th>Sessions</th>
                <th>Avg Competency</th>
              </tr>
            </thead>
            <tbody>
              {managerSummaries.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.seniorManagerName}</td>
                  <td>{m.branch || '—'}</td>
                  <td>{statusBadge(m.status)}</td>
                  <td>{m.totalPlanners}</td>
                  <td>
                    {m.totalPlanners ? `${m.coachedAtLeastOnce} of ${m.totalPlanners} (${m.pctCoached}%)` : '—'}
                  </td>
                  <td>{m.totalSessions}</td>
                  <td>{competencyLabel(m.avgCompetency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
