import React from 'react';
import './SalesCycleWheel.css';

// Renders the 5 stages as a ring around a center "Branding" hub, matching
// the layout of the 1Sang branding illustration (Prospecting at top, then
// clockwise: Presentation, Objection-Handling, Closing, Maximizing Sales).
// Curved arrows run around the ring in that same order and loop back from
// Maximizing Sales to Prospecting, showing this is a cycle, not a straight
// line. Thin spokes connect each stage back to the Branding hub at the
// center. Every node - including the center - is a real button so it
// works with click, keyboard and screen readers, not just a static
// picture.
const RADIUS_PERCENT = 36;
const ARC_INSET_DEG = 15;

const pointAt = (angleDeg, radius) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + radius * Math.sin(angleRad),
    y: 50 - radius * Math.cos(angleRad),
  };
};

const nodePosition = (index) => pointAt(index * 72, RADIUS_PERCENT);

const SalesCycleWheel = ({ topics, selectedKey, onSelect }) => {
  const center = topics.find((t) => t.isCenter);
  const stages = topics.filter((t) => !t.isCenter).sort((a, b) => a.order - b.order);

  return (
    <div className="sales-cycle-wheel">
      <svg className="wheel-connectors" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          {stages.map((stage) => (
            <marker
              key={stage.key}
              id={`arrow-${stage.key}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={stage.color} />
            </marker>
          ))}
        </defs>

        {/* thin spokes from each stage to the Branding hub */}
        {stages.map((stage, index) => {
          const { x, y } = nodePosition(index);
          return (
            <line key={stage.key} x1={50} y1={50} x2={x} y2={y} stroke="#ece1d4" strokeWidth={1} />
          );
        })}

        {/* curved arrows around the ring: Prospecting -> Presentation ->
            Objection-Handling -> Closing -> Maximizing Sales -> Prospecting */}
        {stages.map((stage, index) => {
          const next = (index + 1) % stages.length;
          const p1 = pointAt(index * 72 + ARC_INSET_DEG, RADIUS_PERCENT);
          const p2 = pointAt(next * 72 - ARC_INSET_DEG, RADIUS_PERCENT);
          return (
            <path
              key={`arc-${stage.key}`}
              d={`M ${p1.x} ${p1.y} A ${RADIUS_PERCENT} ${RADIUS_PERCENT} 0 0 1 ${p2.x} ${p2.y}`}
              fill="none"
              stroke={stage.color}
              strokeWidth={1.6}
              markerEnd={`url(#arrow-${stage.key})`}
            />
          );
        })}
      </svg>

      {stages.map((stage, index) => {
        const { x, y } = nodePosition(index);
        const isActive = selectedKey === stage.key;
        return (
          <button
            key={stage.key}
            type="button"
            className={`wheel-node ${isActive ? 'active' : ''}`}
            style={{ left: `${x}%`, top: `${y}%`, '--node-color': stage.color }}
            onClick={() => onSelect(stage.key)}
            aria-pressed={isActive}
          >
            {stage.shortLabel}
          </button>
        );
      })}

      {center && (
        <button
          type="button"
          className={`wheel-center ${selectedKey === center.key ? 'active' : ''}`}
          style={{ '--node-color': center.color }}
          onClick={() => onSelect(center.key)}
          aria-pressed={selectedKey === center.key}
        >
          {center.shortLabel}
        </button>
      )}
    </div>
  );
};

export default SalesCycleWheel;
