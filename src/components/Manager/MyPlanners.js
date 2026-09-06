import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';
import CoachingDetailModal from '../Layout/CoachingDetailModal';
import PlannerCoachingModal from '../Layout/PlannerCoachingModal';
import './ManagerDashboard.css';

const statusBadge = (status) => {
  const map = {
    completed: { cls: 'status-coaching', label: 'Completed' },
    acknowledged: { cls: 'status-acknowledged', label: 'Acknowledged' },
    needCoaching: { cls: 'status-pending', label: 'Needs Coaching' },
  };
  const { cls, label } = map[status] || map.needCoaching;
  return <span className={`status-badge ${cls}`}>{label}</span>;
};

// Manager's "My Planners" sidebar page: everyone on this Manager's roster,
// by name - click one to see their full coaching history, and click a
// topic in there to see the full detail for that one session. Built fresh
// against the live schema/services (dashboardService.getManagerDashboard),
// not the old PlannerProfile.js, which called a userService method that
// doesn't exist.
const MyPlanners = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedPlanner, setSelectedPlanner] = useState(null);
  const [detailSession, setDetailSession] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const dashboardData = await dashboardService.getManagerDashboard(user.id);
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

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  const buckets = data?.buckets || { needCoaching: [], acknowledged: [], completed: [] };
  const sessions = data?.sessions || [];

  const planners = [
    ...buckets.needCoaching.map((e) => ({ ...e.planner, status: 'needCoaching' })),
    ...buckets.acknowledged.map((e) => ({ ...e.planner, status: 'acknowledged' })),
    ...buckets.completed.map((e) => ({ ...e.planner, status: 'completed' })),
  ].sort((a, b) => a.full_name.localeCompare(b.full_name));

  const sessionsFor = (plannerId) => sessions.filter((s) => s.planner_id === plannerId);

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <p className="header-subtitle">1Sang Banyuhay Financial Group</p>
          <h1 className="header-title">MY PLANNERS</h1>
        </div>
        <div className="header-date">{formatHeaderDate()}</div>
      </div>

      <div className="card">
        <h2 className="section-title">YOUR PLANNERS</h2>

        {planners.length === 0 ? (
          <div className="no-data">No planners reporting to you yet</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Planner</th>
                <th>Branch</th>
                <th>Sessions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {planners.map((planner) => (
                <tr key={planner.id}>
                  <td>
                    <button
                      type="button"
                      className="topic-link"
                      onClick={() => setSelectedPlanner(planner)}
                    >
                      {planner.full_name}
                    </button>
                  </td>
                  <td>{planner.branch || '—'}</td>
                  <td>{sessionsFor(planner.id).length}</td>
                  <td>{statusBadge(planner.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedPlanner && (
        <PlannerCoachingModal
          planner={selectedPlanner}
          sessions={sessionsFor(selectedPlanner.id)}
          onSelectTopic={setDetailSession}
          onStartSession={() => navigate('/manager/coaching/start')}
          onClose={() => setSelectedPlanner(null)}
        />
      )}

      {detailSession && (
        <CoachingDetailModal session={detailSession} recipientLabel="Planner" onClose={() => setDetailSession(null)} />
      )}
    </div>
  );
};

export default MyPlanners;
