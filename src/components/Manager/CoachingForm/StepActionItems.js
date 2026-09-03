import React, { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import './CoachingFormSteps.css';

const StepActionItems = ({ formData, updateFormData, planners }) => {
  const [newAction, setNewAction] = useState({
    action: '',
    assignedToId: '',
    dueDate: '',
  });

  const handleAddActionItem = () => {
    if (!newAction.action.trim() || !newAction.assignedToId || !newAction.dueDate) {
      alert('Please fill in all fields');
      return;
    }

    const actionItems = [...formData.actionItems];
    actionItems.push({
      ...newAction,
      id: Date.now().toString(), // Temporary ID for UI
    });

    updateFormData({ actionItems });
    setNewAction({ action: '', assignedToId: '', dueDate: '' });
  };

  const handleRemoveActionItem = (id) => {
    const actionItems = formData.actionItems.filter(item => item.id !== id);
    updateFormData({ actionItems });
  };

  const handleFollowUpDateChange = (date) => {
    updateFormData({
      followUpRequired: !!date,
      followUpDate: date,
    });
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const getAssignedToName = (userId) => {
    const planner = planners.find(p => p.id === userId);
    return planner ? `${planner.first_name} ${planner.last_name}` : 'Unknown';
  };

  return (
    <div className="step-content">
      <div className="step-section">
        <h2>Action Items & Follow-up</h2>
        <p className="section-description">
          Document any agreed-upon action items and schedule a follow-up if needed.
        </p>
      </div>

      {/* Follow-up Section */}
      <div className="step-section">
        <h3>Schedule Follow-up</h3>
        <div className="form-group">
          <label htmlFor="follow-up-date">Follow-up Date (optional)</label>
          <input
            id="follow-up-date"
            type="date"
            value={formData.followUpDate || ''}
            onChange={(e) => handleFollowUpDateChange(e.target.value)}
            min={getTodayDate()}
          />
          {formData.followUpDate && (
            <p className="form-hint">
              A follow-up is scheduled for {new Date(formData.followUpDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Observations Section */}
      <div className="step-section">
        <h3>Overall Observations</h3>
        <div className="form-group">
          <label htmlFor="observations">Session Notes (optional)</label>
          <textarea
            id="observations"
            value={formData.observations || ''}
            onChange={(e) => updateFormData({ observations: e.target.value })}
            placeholder="Any overall notes or observations from this coaching session..."
            rows={4}
          />
        </div>
      </div>

      {/* Action Items Section */}
      <div className="step-section">
        <h3>Action Items</h3>
        <p className="section-description">
          Add specific, agreed-upon action items from this coaching session.
        </p>

        {/* Add New Action Item Form */}
        <div className="add-action-item-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="new-action">Action</label>
              <input
                id="new-action"
                type="text"
                value={newAction.action}
                onChange={(e) => setNewAction(prev => ({ ...prev, action: e.target.value }))}
                placeholder="e.g., Complete FNA template for 5 prospects..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="assigned-to">Assigned To</label>
              <select
                id="assigned-to"
                value={newAction.assignedToId}
                onChange={(e) => setNewAction(prev => ({ ...prev, assignedToId: e.target.value }))}
              >
                <option value="">Select...</option>
                {planners.map(planner => (
                  <option key={planner.id} value={planner.id}>
                    {planner.first_name} {planner.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="action-due-date">Due Date</label>
              <input
                id="action-due-date"
                type="date"
                value={newAction.dueDate}
                onChange={(e) => setNewAction(prev => ({ ...prev, dueDate: e.target.value }))}
                min={getTodayDate()}
              />
            </div>

            <button
              className="btn-primary btn-add-action"
              onClick={handleAddActionItem}
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        </div>

        {/* Action Items List */}
        {formData.actionItems.length > 0 && (
          <div className="action-items-list">
            <h4>Items Added ({formData.actionItems.length})</h4>
            <div className="items">
              {formData.actionItems.map(item => (
                <div key={item.id} className="action-item">
                  <div className="action-item-content">
                    <CheckCircle2 size={20} className="icon" />
                    <div className="action-item-details">
                      <p className="action-text">{item.action}</p>
                      <div className="action-meta">
                        <span className="assigned-to">
                          Assigned to: <strong>{getAssignedToName(item.assignedToId)}</strong>
                        </span>
                        <span className="due-date">
                          Due: <strong>{new Date(item.dueDate).toLocaleDateString()}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleRemoveActionItem(item.id)}
                    title="Remove"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepActionItems;
