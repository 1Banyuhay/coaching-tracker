import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { coachingService } from '../../../services/coachingService';
import { userService } from '../../../services/userService';
import StepSelectPlanner from './StepSelectPlanner';
import StepSelectTopics from './StepSelectTopics';
import StepAssessment from './StepAssessment';
import StepActionItems from './StepActionItems';
import StepReview from './StepReview';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CoachingFormWizard.css';

const CoachingFormWizard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plannerId: '',
    coachingDate: new Date().toISOString().split('T')[0],
    selectedTopics: [], // Array of { topicId, itemIds: [] }
    assessments: {}, // { itemId: { rating, validationMethod, notes } }
    actionItems: [], // Array of { action, assignedToId, dueDate }
    observations: '',
    followUpRequired: false,
    followUpDate: null,
  });

  const [planners, setPlanners] = useState([]);
  const [selectedPlanner, setSelectedPlanner] = useState(null);

  useEffect(() => {
    loadPlanners();
    if (sessionId) {
      loadExistingSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, sessionId]);

  const loadPlanners = async () => {
    try {
      const { data } = await userService.getManagerPlanners(profile.id);
      setPlanners(data || []);
    } catch (error) {
      console.error('Error loading planners:', error);
      toast.error('Failed to load planners');
    }
  };

  const loadExistingSession = async () => {
    try {
      const { data: session } = await coachingService.getCoachingSession(sessionId);
      if (session && session.manager_id === profile.id) {
        // Load assessments and action items if needed
        await coachingService.getSessionAssessments(sessionId);
        await coachingService.getSessionActionItems(sessionId);
        
        setFormData(prev => ({
          ...prev,
          plannerId: session.planner_id,
          coachingDate: session.coaching_date,
          observations: session.observations || '',
          followUpRequired: session.follow_up_required || false,
          followUpDate: session.follow_up_date,
        }));
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
      window.scrollTo(0, 0);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.plannerId) {
          toast.error('Please select a planner');
          return false;
        }
        if (!formData.coachingDate) {
          toast.error('Please select a coaching date');
          return false;
        }
        return true;
      case 2:
        if (formData.selectedTopics.length === 0) {
          toast.error('Please select at least one topic');
          return false;
        }
        return true;
      case 3:
        // At least one item should be assessed
        const assessedItems = Object.keys(formData.assessments);
        if (assessedItems.length === 0) {
          toast.error('Please assess at least one coaching item');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmitCoaching = async () => {
    setLoading(true);
    try {
      let newSessionId = sessionId;

      if (!sessionId) {
        // Create new session
        const { data: session, error } = await coachingService.createCoachingSession(
          profile.id,
          formData.plannerId,
          formData.coachingDate
        );

        if (error) throw error;
        newSessionId = session.id;
      }

      // Add assessments
      for (const [itemId, assessment] of Object.entries(formData.assessments)) {
        await coachingService.addAssessment(
          newSessionId,
          itemId,
          assessment.rating,
          assessment.validationMethod,
          assessment.notes
        );
      }

      // Add action items
      for (const actionItem of formData.actionItems) {
        await coachingService.addActionItem(
          newSessionId,
          actionItem.action,
          actionItem.assignedToId,
          actionItem.dueDate
        );
      }

      // Submit session
      await coachingService.submitCoachingSession(
        newSessionId,
        formData.observations,
        formData.followUpRequired,
        formData.followUpDate
      );

      toast.success('Coaching session submitted! Awaiting planner confirmation.');
      navigate('/manager/dashboard');
    } catch (error) {
      console.error('Error submitting coaching:', error);
      toast.error('Failed to submit coaching session');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const stepTitles = [
    'Select Planner',
    'Select Topics',
    'Assess Competency',
    'Action Items',
    'Review & Submit',
  ];

  const handleCancel = () => {
    if (window.confirm('Are you sure? Any unsaved progress will be lost.')) {
      navigate('/manager/dashboard');
    }
  };

  return (
    <div className="coaching-wizard">
      {/* Header */}
      <div className="wizard-header">
        <h1>Coaching Session</h1>
        <div className="wizard-progress">
          <p className="progress-text">Step {currentStep} of 5</p>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="wizard-steps">
        {stepTitles.map((title, index) => (
          <div
            key={index}
            className={`step-indicator ${
              index + 1 === currentStep
                ? 'active'
                : index + 1 < currentStep
                ? 'completed'
                : ''
            }`}
            onClick={() => index + 1 < currentStep && setCurrentStep(index + 1)}
          >
            <div className="step-number">{index + 1}</div>
            <p className="step-title">{title}</p>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {currentStep === 1 && (
          <StepSelectPlanner
            formData={formData}
            updateFormData={updateFormData}
            planners={planners}
            selectedPlanner={selectedPlanner}
            setSelectedPlanner={setSelectedPlanner}
          />
        )}

        {currentStep === 2 && (
          <StepSelectTopics
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 3 && (
          <StepAssessment
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 4 && (
          <StepActionItems
            formData={formData}
            updateFormData={updateFormData}
            planners={planners}
          />
        )}

        {currentStep === 5 && (
          <StepReview
            formData={formData}
            updateFormData={updateFormData}
            selectedPlanner={selectedPlanner}
            planners={planners}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-footer">
        <button
          className="btn-secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </button>

        <div className="nav-buttons">
          <button
            className="btn-secondary"
            onClick={handlePrevStep}
            disabled={currentStep === 1 || loading}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          {currentStep < 5 ? (
            <button
              className="btn-primary"
              onClick={handleNextStep}
              disabled={loading}
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn-primary btn-success"
              onClick={handleSubmitCoaching}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Coaching Session'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachingFormWizard;
