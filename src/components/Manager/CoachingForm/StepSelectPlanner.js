import React, { useEffect } from 'react';
import { formatDate } from '../../../utils/dateHelpers';
import { Calendar, Users } from 'lucide-react';
import './CoachingFormSteps.css';

const StepSelectPlanner = ({
  formData,
  updateFormData,
  planners,
  selectedPlanner,
  setSelectedPlanner,
}) => {
  useEffect(() => {
    if (formData.plannerId) {
      const planner = planners.find(p => p.id === formData.plannerId);
      setSelectedPlanner(planner);
    }
  }, [formData.plannerId, planners, setSelectedPlanner]);

  const handlePlannerSelect = (planner) => {
    setSelectedPlanner(planner);
    updateFormData({ plannerId: planner.id });
  };

  return (
    <div className="step-content">
      <div className="step-section">
        <h2>Select a Planner</h2>
        <p className="section-description">
          Choose which financial planner you'll be coaching today
        </p>

        <div className="planner-grid">
          {planners.length === 0 ? (
            <div className="empty-message">
              <Users size={48} />
              <p>No planners assigned to you yet</p>
            </div>
          ) : (
            planners.map(planner => (
              <div
                key={planner.id}
                className={`planner-card ${
                  selectedPlanner?.id === planner.id ? 'selected' : ''
                }`}
                onClick={() => handlePlannerSelect(planner)}
              >
                <div className="planner-avatar">
                  {planner.first_name.charAt(0)}{planner.last_name.charAt(0)}
                </div>
                <div className="planner-details">
                  <h3>{planner.first_name} {planner.last_name}</h3>
                  <p className="planner-email">{planner.email}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedPlanner && (
        <div className="step-section">
          <h2>Coaching Date</h2>
          <p className="section-description">
            When did (or will) this coaching session take place?
          </p>

          <div className="form-group">
            <label htmlFor="coaching-date">
              <Calendar size={18} />
              Coaching Date
            </label>
            <input
              id="coaching-date"
              type="date"
              value={formData.coachingDate}
              onChange={(e) => updateFormData({ coachingDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="selected-summary">
            <h4>Your Selection</h4>
            <div className="summary-item">
              <span className="label">Planner:</span>
              <span className="value">
                {selectedPlanner.first_name} {selectedPlanner.last_name}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Coaching Date:</span>
              <span className="value">
                {formatDate(formData.coachingDate)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepSelectPlanner;
