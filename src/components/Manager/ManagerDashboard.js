import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { coachingService } from '../../services/coachingService';
import { getDateRange, formatDate } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalPlanners: 0,
    plannersCoached: 0,
    totalSessions: 0,
  });

  const loadDashboardData = async (profileData) => {
    console.log('🟢 loadDashboardData called with:', profileData);
    setLoading(true);
    try {
      console.log('🟢 Getting date range...');
      const range = getDateRange('month');
      console.log('🟢 Date range:', range);
      
      console.log('🟢 Calling coachingService.getManagerCoachingSessions...');
      const { data: coachingSessions, error } = await coachingService.getManagerCoachingSessions(
        profileData.id,
        range.start,
        range.end
      );
      console.log('🟢 coachingService returned:', { sessionsCount: coachingSessions?.length, error });

      if (error) {
        console.error('🟢 Error:', error);
        toast.error('Failed to load coaching sessions');
        setLoading(false);
        return;
      }

      console.log('🟢 Setting sessions and stats...');
      setSessions(coachingSessions || []);
      setStats({
        totalSessions: coachingSessions?.length || 0,
        plannersCoached: new Set(coachingSessions?.map(s => s.planner_id) || []).size,
        totalPlanners: 1,
      });
      console.log('🟢 Dashboard data loaded!');
      setLoading(false);
    } catch (err) {
      console.error('🟢 Catch error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🟢 Dashboard useEffect - authLoading:', authLoading, 'profile:', profile);
    
    if (authLoading) {
      console.log('🟢 Still waiting for auth...');
      return;
    }

    if (!profile) {
      console.log('🟢 No profile!');
      setLoading(false);
      return;
    }

    console.log('🟢 Profile ready, loading dashboard data');
    loadDashboardData(profile);
  }, [profile, authLoading]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f5f1ed'
      }}>
        <p style={{ color: '#6b4423', fontSize: '16px' }}>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Coaching Dashboard</h1>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.plannersCoached}</div>
          <div className="stat-label">Planners Coached</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No coaching sessions found</p>
        </div>
      ) : (
        <div className="section">
          <h2>Recent Sessions</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{formatDate(session.coaching_date)}</td>
                  <td>1 item</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
