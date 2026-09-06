import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { followUpCounts } from '../../services/dashboardService';

// Unmissable heads-up at the top of a coach's dashboard (Manager, Senior
// Manager) - the "notification" for follow-ups, since this app has no
// email/push infrastructure: whoever logs in sees it immediately, every
// time, until it's handled. Missed takes priority over ready when both
// exist; shows nothing when there's nothing due soon or overdue.
const FollowUpBanner = ({ sessions }) => {
  const counts = followUpCounts(sessions);
  if (counts.missed === 0 && counts.ready === 0) return null;

  const parts = [];
  if (counts.missed > 0) parts.push(`${counts.missed} follow-up${counts.missed === 1 ? '' : 's'} missed`);
  if (counts.ready > 0) parts.push(`${counts.ready} ready to follow up now`);
  if (counts.upcoming > 0) parts.push(`${counts.upcoming} due within a week`);

  const tone = counts.missed > 0 ? 'banner-missed' : 'banner-ready';
  const Icon = counts.missed > 0 ? AlertTriangle : Clock;

  return (
    <div className={`followup-banner ${tone}`}>
      <Icon size={18} />
      <span>{parts.join(' · ')}</span>
    </div>
  );
};

export default FollowUpBanner;
