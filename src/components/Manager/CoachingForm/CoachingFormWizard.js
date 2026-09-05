import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { userService } from '../../../services/userService';
import { dashboardService } from '../../../services/dashboardService';
import { supabaseClient } from '../../../config/supabase';
import toast from 'react-hot-toast';
import './CoachingFormWizard.css';

const TOPIC_OPTIONS = [
  'Riders', 'Smart Start', 'Manifest', 'Fast Lane', 'Wealth+', 'Set for Health',
  'Future Sure', 'The One', 'Branding', 'Prospecting', 'Appointment Setting',
  'Objection-Handling', 'Closing', 'Cube App', 'Omne App', 'FNA FBB App',
  'Financial Building Blocks', 'Policy Review', 'Investment Discussion',
  'Debt Management', 'Incentives', 'Compensation', 'Promotion', 'Others',
];

const COMPETENCY_LABELS = ['Need Coaching', 'Developing', 'Competent', 'Proficient'];

const CoachingFormWizard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Two ways this screen is opened besides the plain "+ Start New Coaching
  // Session" button:
  //  - recipientType: 'manager' - a Senior Manager coaching one of their
  //    managers directly, from the "Coaching Sessions With Managers" button.
  //  - followUpFrom: an existing coaching_records row (with planner_name
  //    already attached) - opened from a "Log Follow-Up" action on a
  //    dashboard table row. Recipient is locked to that same person and
  //    submitting closes the loop on the original record instead of
  //    creating a standalone one.
  const forcedRecipientType = location.state?.recipientType === 'manager' ? 'manager' : 'planner';
  const followUpFrom = location.state?.followUpFrom || null;
  const recipientType = followUpFrom
    ? (location.state?.recipientLabel === 'Manager' ? 'manager' : 'planner')
    : forcedRecipientType;
  const recipientLabel = recipientType === 'manager' ? 'Manager' : 'Planner';

  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(!followUpFrom);
  const [submitting, setSubmitting] = useState(false);

  const [recipientId, setRecipientId] = useState(followUpFrom ? String(followUpFrom.planner_id) : '');
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [competency, setCompetency] = useState(2);
  const [discussion, setDiscussion] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const dashboardPath = user?.role === 'senior_manager' ? '/senior-manager/dashboard' : '/manager/dashboard';

  useEffect(() => {
    if (!user?.id || followUpFrom) return;

    const loadRecipients = async () => {
      try {
        let list;
        if (user.role === 'senior_manager' && recipientType === 'manager') {
          list = await userService.getManagersForSeniorManager(user.id);
        } else if (user.role === 'senior_manager') {
          // Scoped to this Senior Manager's own branch, not every planner
          // in the organization.
          list = await userService.getPlannersForSeniorManager(user.id);
        } else {
          list = await userService.getTeamRoster(user.id);
        }
        setRecipients(list);
      } catch (error) {
        console.error('Error loading recipients:', error);
        toast.error(`Failed to load ${recipientLabel.toLowerCase()}s`);
      } finally {
        setLoadingRecipients(false);
      }
    };

    loadRecipients();
  }, [user?.id, user?.role, recipientType, followUpFrom, recipientLabel]);

  const finalTopic = useMemo(() => (topic === 'Others' ? customTopic.trim() : topic), [topic, customTopic]);

  const isComplete =
    recipientId && finalTopic && discussion.trim() && actionItems.trim() && followUpDate;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error('Please complete all sections before saving');
      return;
    }

    setSubmitting(true);
    try {
      const fields = {
        planner_id: parseInt(recipientId, 10),
        coach_id: user.id,
        topic: finalTopic,
        competency_level: competency,
        discussion_notes: discussion.trim(),
        action_items: actionItems.trim(),
        follow_up_date: followUpDate,
      };

      if (followUpFrom) {
        await dashboardService.logFollowUp(followUpFrom, fields);
        toast.success('Follow-up logged - the original session is now marked complete.');
      } else {
        const { error } = await supabaseClient.from('coaching_records').insert({
          ...fields,
          status: 'pending',
        });
        if (error) throw error;
        toast.success('Coaching session saved! Awaiting acknowledgement.');
      }

      navigate(dashboardPath);
    } catch (error) {
      console.error('Error saving coaching session:', error);
      toast.error('Failed to save coaching session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Discard this coaching log?')) {
      navigate(dashboardPath);
    }
  };

  return (
    <div className="coaching-log">
      <div className="log-header">
        <h1>Coaching Log</h1>
        <p>
          {followUpFrom
            ? `Follow-up session with ${followUpFrom.planner_name}`
            : `Record a coaching session with a ${recipientLabel.toLowerCase()}`}
        </p>
      </div>

      <div className="log-card">
        <div className="log-section">
          <div className="section-header">
            <div className="section-number">1</div>
            <div className="section-title">{recipientLabel}</div>
          </div>

          {followUpFrom ? (
            <div className="info-text"><strong>{followUpFrom.planner_name}</strong> (locked - continuing a logged follow-up)</div>
          ) : loadingRecipients ? (
            <div className="info-text">Loading {recipientLabel.toLowerCase()}s...</div>
          ) : recipients.length === 0 ? (
            <div className="no-data">
              {user?.role === 'senior_manager'
                ? `No ${recipientLabel.toLowerCase()}s are registered under your branch yet.`
                : 'No planners are assigned to you yet. Ask your Senior Manager to add you as their manager in Manage Team.'}
            </div>
          ) : (
            <select className="form-control" value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
              <option value="">-- Select a {recipientLabel.toLowerCase()} --</option>
              {recipients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}{p.branch ? ` (${p.branch})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="log-section">
          <div className="section-header">
            <div className="section-number">2</div>
            <div className="section-title">Coaching Focus Area</div>
          </div>

          <select className="form-control" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">-- Select a topic --</option>
            {TOPIC_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {topic === 'Others' && (
            <input
              type="text"
              className="form-control"
              style={{ marginTop: '0.75rem' }}
              placeholder="Please specify the coaching topic..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
            />
          )}
        </div>

        <div className="log-section">
          <div className="section-header">
            <div className="section-number">3</div>
            <div className="section-title">Competency Level</div>
          </div>

          <div className="competency-slider-section">
            <div className="slider-labels">
              {COMPETENCY_LABELS.map((label) => <span key={label}>{label}</span>)}
            </div>
            <input
              type="range"
              min="1"
              max="4"
              value={competency}
              onChange={(e) => setCompetency(parseInt(e.target.value, 10))}
            />
          </div>
          <div className="info-text">Current selection: {COMPETENCY_LABELS[competency - 1]}</div>
        </div>

        <div className="log-section">
          <div className="section-header">
            <div className="section-number">4</div>
            <div className="section-title">Discussion Notes</div>
          </div>
          <textarea
            className="form-control"
            placeholder="What did you observe? What coaching was provided?"
            value={discussion}
            onChange={(e) => setDiscussion(e.target.value)}
          />
        </div>

        <div className="log-section">
          <div className="section-header">
            <div className="section-number">5</div>
            <div className="section-title">Action Items &amp; Follow-Up</div>
          </div>
          <textarea
            className="form-control"
            placeholder="What needs to happen before the next coaching session?"
            value={actionItems}
            onChange={(e) => setActionItems(e.target.value)}
          />
          <label className="field-label" htmlFor="followup-date">Follow-Up Date</label>
          <input
            id="followup-date"
            type="date"
            className="form-control"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>

        <div className="status-bar">
          {isComplete ? '✓ All sections complete - ready to save' : '○ Complete all sections to proceed'}
        </div>

        <div className="button-group">
          <button type="button" className="btn-secondary" onClick={handleCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting || !isComplete}>
            {submitting ? 'Saving...' : 'Save Coaching Log'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachingFormWizard;
