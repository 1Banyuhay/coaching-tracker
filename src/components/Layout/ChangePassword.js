import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';
import '../Manager/CoachingForm/CoachingFormWizard.css';
import './ChangePassword.css';

const ChangePassword = ({ forced = false, onDone }) => {
  const { user, updateStoredUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentPassword !== user.password) {
      toast.error('Current password is incorrect');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await userService.changeOwnPassword(user.id, newPassword);
      updateStoredUser({ password: newPassword, password_reset_required: false });
      toast.success('Password updated');
      if (onDone) onDone();
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={forced ? 'change-password-gate' : 'change-password-page'}>
      <div className="change-password-card">
        <h1>{forced ? 'Set a New Password' : 'Change Password'}</h1>
        <p className="info-text">
          {forced
            ? 'For security, please set your own password before continuing.'
            : 'Update the password you use to sign in.'}
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Current Password</label>
          <input
            type="password"
            className="form-control"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <label className="field-label">New Password</label>
          <input
            type="password"
            className="form-control"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <label className="field-label">Confirm New Password</label>
          <input
            type="password"
            className="form-control"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button type="submit" className="btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} disabled={saving}>
            {saving ? 'Saving...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
