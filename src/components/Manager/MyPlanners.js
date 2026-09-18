import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService';
import { plannerRequestService } from '../../services/plannerRequestService';
import CoachingDetailModal from '../Layout/CoachingDetailModal';
import PlannerCoachingModal from '../Layout/PlannerCoachingModal';
import toast from 'react-hot-toast';
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

const requestStatusBadge = (request) => {
  if (request.status === 'confirmed') return <span className="status-badge status-acknowledged">Confirmed</span>;
  if (request.status === 'rejected') return <span className="status-badge status-expired">Rejected</span>;
  return <span className="status-badge status-pending">Pending Review</span>;
};

const emptyForm = { fullName: '', username: '' };

// Manager's "My Planners" sidebar page: everyone on this Manager's roster,
// by name - click one to see their full coaching history, and click a
// topic in there to see the full detail for that one session. Built fresh
// against the live schema/services (dashboardService.getManagerDashboard),
// not the old PlannerProfile.js, which called a userService method that
// doesn't exist.
//
// Also where a Manager requests a new planner account. Unlike a Senior
// Manager's "+ Add Planner" on Manage Team (which creates the account
// immediately), a Manager's request sits pending until their Senior
// Manager confirms it - see plannerRequestService.js and the review panel
// on TeamManagement.js. Once confirmed, the account shows up in the list
// below automatically (it's just another active planner reporting to this
// Manager), and the temporary password is revealed here once, the same
// one-time-reveal pattern Manage Team already uses for a direct add.
const MyPlanners = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedPlanner, setSelectedPlanner] = useState(null);
  const [detailSession, setDetailSession] = useState(null);
  const [requests, setRequests] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState(null); // { requestId, name, username, tempPassword }
  const [acknowledging, setAcknowledging] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const [dashboardData, requestList] = await Promise.all([
      dashboardService.getManagerDashboard(user.id),
      plannerRequestService.getRequestsForManager(user.id),
    ]);
    setData(dashboardData);
    setRequests(requestList);
    setLoading(false);

    // A request that just got confirmed carries its temp password once -
    // surface it the moment it shows up, without waiting on anything else
    // to happen first.
    const withPassword = requestList.find((r) => r.status === 'confirmed' && r.temp_password);
    if (withPassword && !revealedPassword) {
      setRevealedPassword({
        requestId: withPassword.id,
        name: withPassword.full_name,
        username: withPassword.username,
        tempPassword: withPassword.temp_password,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatHeaderDate = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  const handleAddPlanner = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.username.trim()) {
      toast.error('Full name and username are required');
      return;
    }

    setSubmitting(true);
    try {
      await plannerRequestService.requestPlanner({
        requestedBy: user.id,
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        branch: user?.branch || '',
      });
      toast.success('Request sent to your Senior Manager for confirmation.');
      setForm(emptyForm);
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('Error requesting planner:', error);
      toast.error(error.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(revealedPassword.tempPassword);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy automatically - select and copy manually');
    }
  };

  const closeRevealedPassword = async () => {
    setAcknowledging(true);
    try {
      await plannerRequestService.acknowledgeTempPassword(revealedPassword.requestId);
    } catch (error) {
      console.error('Error clearing temp password:', error);
      // Non-fatal - the Manager has already seen and (hopefully) copied
      // it, so still close the modal rather than getting stuck on it.
    } finally {
      setAcknowledging(false);
      setRevealedPassword(null);
      loadData();
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>LIST OF PLANNERS</h2>
          <button type="button" className="cta-button" style={{ marginTop: 0 }} onClick={() => setShowAddForm(true)}>
            + ADD PLANNER
          </button>
        </div>

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

      {requests.length > 0 && (
        <div className="card">
          <h2 className="section-title">ADD PLANNER REQUESTS</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Username</th>
                <th>Requested</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.full_name}</strong></td>
                  <td>{r.username}</td>
                  <td>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>
                    {requestStatusBadge(r)}
                    {r.status === 'rejected' && r.reject_reason && (
                      <div className="info-text" style={{ marginTop: '0.25rem' }}>{r.reject_reason}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
        <CoachingDetailModal session={detailSession} recipientLabel="Planner" onClose={() => setDetailSession(null)} onFollowUpDateUpdated={loadData} />
      )}

      {showAddForm && (
        <div className="summary-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>Add Planner</h2>
              <button className="summary-modal-close" onClick={() => setShowAddForm(false)}>×</button>
            </div>
            <form className="summary-modal-body team-form" onSubmit={handleAddPlanner}>
              <p className="info-text" style={{ marginBottom: '1rem' }}>
                This goes to your Senior Manager for confirmation before the account is created.
              </p>

              <label className="field-label">Full Name</label>
              <input className="form-control" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />

              <label className="field-label">Username</label>
              <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. juan.delacruz" />

              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Sending...' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {revealedPassword && (
        <div className="summary-modal-overlay">
          <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-modal-header">
              <h2>Planner Added - Temporary Password</h2>
            </div>
            <div className="summary-modal-body">
              <p style={{ marginBottom: '1rem' }}>
                Your Senior Manager confirmed <strong>{revealedPassword.name}</strong> (username <strong>{revealedPassword.username}</strong>).
                Share this password with them. They will be asked to set their own password the first time they log in.
                This won&apos;t be shown again.
              </p>
              <div className="temp-password-box">
                <code>{revealedPassword.tempPassword}</code>
                <button type="button" className="action-btn" onClick={copyPassword}>Copy</button>
              </div>
              <div className="button-group" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-primary" onClick={closeRevealedPassword} disabled={acknowledging}>
                  {acknowledging ? 'Closing...' : "Got it, I've saved it"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPlanners;
