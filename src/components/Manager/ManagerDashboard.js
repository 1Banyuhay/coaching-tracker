import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { coachingService } from '../../services/coachingService';
import { userService } from '../../services/userService';
import { getDateRange, formatDate } from '../../utils/dateHelpers';
import { Users, FileText, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './ManagerDashboard.css';

const ManagerDashboard = () => {
  console.log('=== ManagerDashboard MOUNTED ===');
  
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  console.log('Profile:', profile);
  console.log('Auth Loading:', authLoading);

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalPlanners: 0,
    plannersCoached: 0,
    totalSessions: 0,
  });

  useEffect(() => {
    console.log('Dashboard useEffect running');
    console.log('Profile available?', !!profile);
    console.log('Auth loading?', authLoading);

    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!profile) {
      console.log('No profile found!');
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [profile, authLoading]);

  const loadDashboardData = async () => {
    console.log('Loading dashboard data for profile:', profile);
    setLoading(true);
    try {
      const range = getDateRange('month');
      console.log('Date range:', range);

      const { data: coachingSessions, error } = await coachingService.getManagerCoachingSessions(
        profile.id,
        range.start,
        range.end
      );

      console.log('Coaching sessions result:', { data: coachingSessions, error });

      if (error) {
        console.error('Error loading sessions:', error);
        toast.error('Failed to load coaching sessions');
        setLoading(false);
        return;
      }

      setSessions(coachingSessions || []);
      setStats({
        totalSessions: coachingSessions?.length || 0,
        plannersCoached: new Set(coachingSessions?.map(s => s.planner_id) || []).size,
        totalPlanners: 1,
      });

      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  console.log('Render state - Loading:', loading, 'Sessions:', sessions.length);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
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
