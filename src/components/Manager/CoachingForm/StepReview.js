import React, { useState, useEffect } from 'react';
import { formatDate } from '../../../utils/dateHelpers';
import { coachingService } from '../../../services/coachingService';
import { CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import './CoachingFormSteps.css';

const COMPETENCY_LABELS = {
  '1_needs_guidance': 'Needs Guidance',
  '2_familiar': 'Familiar',
  '3_can_perform_independently': 'Can Perform Independently',
  '4_can_demonstrate_coach': 'Can Demonstrate/Coach Others',
};

const StepReview = ({ formData, selectedPlanner, planners }) => {
  const [topicNames, setTopicNames] = useState({});

  useEffect(() => {
    loadTopicNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.selectedTopics]);

  const loadTopicNames = async () => {
    const names = {};
    for (const topicEntry of formData.selectedTopics) {
      const topic = await coachingService.getCategoryTopics(topicEntry.categoryId);
      if (topic && topic.data) {
        const found = topic.data.find(t => t.id === topicEntry.topicId);
        if (found) names[topicEntry.topicId] = found.name;
      }
    }
    setTopicNames(names);
  };

  const getAssignedToName = (userId) => {
    const planner = planners.find(p => p.id === userId);
    return planner ? `${planner.first_name} ${planner.last_name}` : 'Unknown';
  };

  const assessedItemsCount = Object.keys(formData.assessments).length;

  return (
    <div className="step-content">
      <div className="step-section">
        <h2>Review Your Coaching Session</h2>
        <p className="section-description">
          Review the details below. Once you submit, the planner will receive a notification to confirm.
        </p>
      </div>

      {/* Session Overview */}
      <div className="review-section">
        <h3>Session Overview</h3>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-label">Planner</span>
            <span className="review-value">
              {selectedPlanner?.first_name} {selectedPlanner?.last_name}
            </span>
          </div>
          <div className="review-item">
            <span className="review-label">Coaching Date</span>
            <span className="review-value">{formatDate(formData.coachingDate)}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Topics Discussed</span>
            <span className="review-value">{formData.selectedTopics.length}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Items Assessed</span>
            <span className="review-value">{assessedItemsCount}</span>
          </div>
        </div>
      </div>

      {/* Topics and Assessments */}
      {formData.selectedTopics.length > 0 && (
        <div className="review-section">
          <h3>Coaching Topics & Assessments</h3>
          <div className="assessments-review">
            {formData.selectedTopics.map(topicEntry => (
              <div key={topicEntry.topicId} className="topic-review">
                <h4>{topicNames[topicEntry.topicId] || 'Topic'}</h4>
                <div className="items-assessed">
                  {topicEntry.itemIds.map(itemId => {
                    const assessment = formData.assessments[itemId];
                    return (
                      <div key={itemId} className="assessment-review">
                        <div className="assessment-rating">
                          {assessment ? (
                            <>
                              <CheckCircle2 size={18} className="checked-icon" />
                              <span className="rating-badge">
                                {COMPETENCY_LABELS[assessment.rating] || 'Unassessed'}
                              </span>
                              {assessment.validationMethod && (
                                <span className="method">({assessment.validationMethod})</span>
                              )}
                            </>
                          ) : (
                            <>
                              <AlertCircle size={18} className="warning-icon" />
                              <span>Not assessed</span>
                            </>
                          )}
                        </div>
                        {assessment?.notes && (
                          <p className="assessment-notes">{assessment.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {formData.actionItems.length > 0 && (
        <div className="review-section">
          <h3>Action Items</h3>
          <div className="action-items-review">
            {formData.actionItems.map((item, index) => (
              <div key={item.id} className="action-item-review">
                <div className="action-item-number">{index + 1}</div>
                <div className="action-item-info">
                  <p className="action-text">{item.action}</p>
                  <div className="action-details">
                    <span>
                      <strong>Assigned to:</strong> {getAssignedToName(item.assignedToId)}
                    </span>
                    <span>
                      <strong>Due:</strong> {formatDate(item.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      {formData.followUpRequired && formData.followUpDate && (
        <div className="review-section">
          <h3>Follow-up Scheduled</h3>
          <div className="follow-up-info">
            <AlertCircle size={20} className="info-icon" />
            <div>
              <p className="info-text">
                A follow-up coaching session is scheduled for{' '}
                <strong>{formatDate(formData.followUpDate)}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Observations */}
      {formData.observations && (
        <div className="review-section">
          <h3>Session Notes</h3>
          <div className="observations-review">
            <p>{formData.observations}</p>
          </div>
        </div>
      )}

      {/* Submission Info */}
      <div className="review-section info-banner">
        <FileText size={20} />
        <div>
          <h4>What Happens Next?</h4>
          <p>
            Once you submit, <strong>{selectedPlanner?.first_name}</strong> will receive a notification
            to confirm this coaching session. Confirmation means they acknowledge the session took place
            and the feedback was discussed.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="review-summary">
        <div className="summary-item">
          <span className="summary-label">Topics Covered</span>
          <span className="summary-value">{formData.selectedTopics.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Items Assessed</span>
          <span className="summary-value">{assessedItemsCount}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Action Items</span>
          <span className="summary-value">{formData.actionItems.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Follow-up Scheduled</span>
          <span className="summary-value">
            {formData.followUpRequired ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StepReview;
