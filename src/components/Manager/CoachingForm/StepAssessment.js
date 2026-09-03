import React, { useEffect, useState } from 'react';
import { coachingService } from '../../../services/coachingService';
import { Target } from 'lucide-react';
import toast from 'react-hot-toast';
import './CoachingFormSteps.css';

const COMPETENCY_LEVELS = [
  { value: '1_needs_guidance', label: 'Needs Guidance', description: 'Requires coaching and support' },
  { value: '2_familiar', label: 'Familiar', description: 'Understands concepts' },
  { value: '3_can_perform_independently', label: 'Can Perform Independently', description: 'Does it without supervision' },
  { value: '4_can_demonstrate_coach', label: 'Can Demonstrate/Coach Others', description: 'Can teach others' },
];

const VALIDATION_METHODS = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'knowledge_check', label: 'Knowledge Check' },
  { value: 'role_play', label: 'Role Play' },
  { value: 'demonstration', label: 'Demonstration' },
  { value: 'client_observation', label: 'Client Observation' },
  { value: 'case_simulation', label: 'Case Simulation' },
  { value: 'output_review', label: 'Output Review' },
  { value: 'other', label: 'Other' },
];

const StepAssessment = ({ formData, updateFormData }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessmentItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selectedTopics]);

  const loadAssessmentItems = async () => {
    try {
      setLoading(true);
      const allItems = [];

      for (const topicEntry of formData.selectedTopics) {
        const { data: topicItems } = await coachingService.getTopicItems(topicEntry.topicId);
        if (topicItems) {
          topicItems
            .filter(item => topicEntry.itemIds.includes(item.id))
            .forEach(item => {
              allItems.push({
                ...item,
                topicId: topicEntry.topicId,
              });
            });
        }
      }

      setItems(allItems);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load items for assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentChange = (itemId, field, value) => {
    const assessments = { ...formData.assessments };
    if (!assessments[itemId]) {
      assessments[itemId] = { rating: null, validationMethod: null, notes: '' };
    }
    assessments[itemId][field] = value;
    updateFormData({ assessments });
  };

  const getAssessment = (itemId) => {
    return formData.assessments[itemId] || { rating: null, validationMethod: null, notes: '' };
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case '1_needs_guidance':
        return 'danger';
      case '2_familiar':
        return 'warning';
      case '3_can_perform_independently':
        return 'success';
      case '4_can_demonstrate_coach':
        return 'success';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return <div className="loading-text">Loading items for assessment...</div>;
  }

  return (
    <div className="step-content">
      <div className="step-section">
        <h2>Assess Competency</h2>
        <p className="section-description">
          Rate the planner's competency level for each item discussed. Only assess items you actually discussed.
        </p>
        <div className="competency-legend">
          {COMPETENCY_LEVELS.map(level => (
            <div key={level.value} className="legend-item">
              <div className={`legend-color level-${getRatingColor(level.value)}`}></div>
              <div className="legend-text">
                <strong>{level.label}</strong> — {level.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-message">
          <Target size={48} />
          <p>No items selected for assessment</p>
        </div>
      ) : (
        <div className="assessment-form">
          {items.map(item => {
            const assessment = getAssessment(item.id);
            return (
              <div key={item.id} className="assessment-card">
                <div className="assessment-header">
                  <h3>{item.name}</h3>
                  {assessment.rating && (
                    <span className={`rating-badge level-${getRatingColor(assessment.rating)}`}>
                      {COMPETENCY_LEVELS.find(l => l.value === assessment.rating)?.label}
                    </span>
                  )}
                </div>

                <div className="assessment-fields">
                  {/* Competency Rating */}
                  <div className="form-group">
                    <label>Competency Level *</label>
                    <div className="rating-options">
                      {COMPETENCY_LEVELS.map(level => (
                        <button
                          key={level.value}
                          className={`rating-option ${
                            assessment.rating === level.value ? 'selected' : ''
                          } ${getRatingColor(level.value)}`}
                          onClick={() =>
                            handleAssessmentChange(item.id, 'rating', level.value)
                          }
                          title={level.description}
                        >
                          <div className="rating-number">{level.value[0]}</div>
                          <div className="rating-label">{level.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Validation Method */}
                  <div className="form-group">
                    <label htmlFor={`method-${item.id}`}>How did you assess this?</label>
                    <select
                      id={`method-${item.id}`}
                      value={assessment.validationMethod || ''}
                      onChange={(e) =>
                        handleAssessmentChange(item.id, 'validationMethod', e.target.value || null)
                      }
                    >
                      <option value="">Select a method...</option>
                      {VALIDATION_METHODS.map(method => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="form-group">
                    <label htmlFor={`notes-${item.id}`}>Observations (optional)</label>
                    <textarea
                      id={`notes-${item.id}`}
                      value={assessment.notes || ''}
                      onChange={(e) =>
                        handleAssessmentChange(item.id, 'notes', e.target.value)
                      }
                      placeholder="Any specific observations or feedback..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StepAssessment;
