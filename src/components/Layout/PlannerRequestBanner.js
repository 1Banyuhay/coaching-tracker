import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';

// Unmissable heads-up for a Senior Manager: one or more of their Managers
// has submitted an "Add Planner" request that's still waiting on review.
// Mirrors AcknowledgeBanner's pattern/CSS - the account can't be used
// until it's confirmed, so this stays in the same urgent red tone rather
// than being tiered like FollowUpBanner.
const PlannerRequestBanner = ({ requests, onClick }) => {
  const pending = (requests || []).filter((r) => r.status === 'pending');
  if (pending.length === 0) return null;

  const count = pending.length;
  const label = `${count} "Add Planner" request${count === 1 ? '' : 's'} waiting for your review`;

  return (
    <button
      type="button"
      className="followup-banner banner-missed"
      onClick={onClick}
      style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', cursor: 'pointer' }}
    >
      <AlertTriangle size={18} />
      <span>{label} - the account can&apos;t be used until you confirm it. Click to review.</span>
      <ChevronRight size={16} style={{ marginLeft: 'auto', flexShrink: 0 }} />
    </button>
  );
};

export default PlannerRequestBanner;
