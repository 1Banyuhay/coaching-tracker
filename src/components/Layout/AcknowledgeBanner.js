import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { countsTowardStats } from '../../services/dashboardService';

// Unmissable heads-up for coaching sessions still waiting on YOUR
// acknowledgement (as a Planner being coached, or a Manager being coached
// by their Senior Manager). Always shown in the urgent tone the moment
// anything is pending - not tiered by time remaining like FollowUpBanner -
// because missing the 24-hour window permanently voids the session, so
// there's no "quiet" phase for this one. Shows nothing once everything
// pending has been acknowledged (or has already expired, which is no
// longer actionable).
const AcknowledgeBanner = ({ sessions }) => {
  const pending = (sessions || []).filter((s) => s.status === 'pending' && countsTowardStats(s));
  if (pending.length === 0) return null;

  const count = pending.length;
  const label = `${count} coaching session${count === 1 ? '' : 's'} waiting for your acknowledgement`;

  return (
    <div className="followup-banner banner-missed">
      <AlertTriangle size={18} />
      <span>{label} — acknowledge within 24 hours of being logged, or {count === 1 ? 'it' : 'they'} won't count.</span>
    </div>
  );
};

export default AcknowledgeBanner;
