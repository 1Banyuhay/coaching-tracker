import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { countsTowardStats } from '../../services/dashboardService';

// Unmissable heads-up for coaching sessions still waiting on YOUR
// acknowledgement (as a Planner being coached, or a Manager being coached
// by their Senior Manager). Always shown in the urgent tone the moment
// anything is pending - not tiered by time remaining like FollowUpBanner -
// because missing the 24-hour window permanently voids the session, so
// there's no "quiet" phase for this one. Shows nothing once everything
// pending has been acknowledged (or has already expired, which is no
// longer actionable).
//
// `onClick`: optional - when provided, the banner renders as a real button
// that takes the user straight to the Need Action list (same place the
// "Need Action" metric card already links to) so they can act right away
// instead of hunting for it further down the page. Without it, the banner
// is just informational (a plain div), same as before.
const AcknowledgeBanner = ({ sessions, onClick }) => {
  const pending = (sessions || []).filter((s) => s.status === 'pending' && countsTowardStats(s));
  if (pending.length === 0) return null;

  const count = pending.length;
  const label = `${count} coaching session${count === 1 ? '' : 's'} waiting for your acknowledgement`;

  const content = (
    <>
      <AlertTriangle size={18} />
      <span>
        {label} — acknowledge within 24 hours of being logged, or {count === 1 ? 'it' : 'they'} won't count.
        {onClick && ' Click to review.'}
      </span>
      {onClick && <ChevronRight size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
    </>
  );

  if (!onClick) {
    return <div className="followup-banner banner-missed">{content}</div>;
  }

  return (
    <button
      type="button"
      className="followup-banner banner-missed"
      onClick={onClick}
      style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', cursor: 'pointer' }}
    >
      {content}
    </button>
  );
};

export default AcknowledgeBanner;
