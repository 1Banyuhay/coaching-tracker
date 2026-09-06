import React from 'react';
import './SalesCycleWheel.css';

// Renders the 5 stages as a ring around a center "Branding" hub, matching
// the layout of the 1Sang branding illustration (Prospecting at top, then
// clockwise: Presentation, Objection-Handling, Closing, Maximizing Sales).
// Each node - including the center - is a real button so it works with
// click, keyboard and screen readers, not just a static picture.
const RADIUS_PERCENT = 36;

const nodePosition = (index) => {
  const angleDeg = index * 72; // clockwise from top, 5 stages = 72 degrees apart
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = 50 + RADIUS_PERCENT * Math.sin(angleRad);
  const y = 50 - RADIUS_PERCENT * Math.cos(angleRad);
  return { x, y };
};

const SalesCycleWheel = ({ topics, selectedKey, onSelect }) => {
  const center = topics.find((t) => t.isCenter);
  const stages = topics.filter((t) => !t.isCenter).sort((a, b) => a.order - b.order);

  return (
    <div className="sales-cycle-wheel">
      <svg className="wheel-connectors" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {stages.map((stage, index) => {
          const { x, y } = nodePosition(index);
          return (
            <line
              key={stage.key}
              x1={50}
              y1={50}
              x2={x}
              y2={y}
              stroke="#e4d9cc"
              strokeWidth={1}
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
