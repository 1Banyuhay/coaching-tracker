import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { userService } from '../../../services/userService';
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

  const [planners, setPlanners] = useState([]);
  const [loadingPlanners, setLoadingPlanners] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [plannerId, setPlannerId] = useState('');
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [competency, setCompetency] = useState(2);
  const [discussion, setDiscussion] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const dashboardPath = user?.role === 'senior_manager' ? '/senior-manager/dashboard' : '/manager/dashboard';

  useEffect(() => {
    if (!user?.id) return;

    const loadPlanners = async () => {
      try {
        const list =
          user.role === 'senior_manager'
            ? await userService.getAllPlanners()
            : await userService.getTeamRoster(user.id);
        setPlanners(list);
      } catch (error) {
        console.error('Error loading planners:', error);
        toast.error('Failed to load planners');
      } finally {
        setLoadingPlanners(false);
      }
    };

    loadPlanners();
  }, [user?.id, user?.role]);

  const finalTopic = useMemo(() => (topic === 'Others' ? customTopic.trim() : topic), [topic, customTopic]);

  const isComplete =
    plannerId && finalTopic && discussion.trim() && actionItems.trim() && followUpDate;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error('Please complete all sections before saving');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabaseClient.from('coaching_records').insert({
        planner_id: parseInt(plannerId, 10),
        coach_id: user.id,
        topic: finalTopic,
        competency_level: competency,
        discussion_notes: discussion.trim(),
        action_items: actionItems.trim(),
        follow_up_date: followUpDate,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Coaching session saved! Awaiting the planner’s acknowledgement.');
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
        <p>Record a coaching session with a planner</p>
      </div>

      <div className="log-card">
        <div className="log-section">
          <div className="section-header">
            <div className="section-number">1</div>
            <div className="section-title">Planner</div>
          </div>

          {loadingPlanners ? (
            <div className="info-text">Loading planners...</div>
          ) : planners.length === 0 ? (
            <div className="no-data">
              {user?.role === 'senior_manager'
                ? 'No planners are registered yet.'
                : 'No planners are assigned to you yet. Ask your Senior Manager to add you as their manager in Manage Team.'}
            </div>
          ) : (
            <select className="form-control" value={plannerId} onChange={(e) => setPlannerId(e.target.value)}>
              <option value="">-- Select a planner --</option>
              {planners.map((p) => (
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
