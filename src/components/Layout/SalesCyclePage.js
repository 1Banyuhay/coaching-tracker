import React, { useState } from 'react';
import { overview, topics } from '../../data/salesCycleContent';
import SalesCycleWheel from './SalesCycleWheel';
import SalesCycleDetail from './SalesCycleDetail';
import '../Manager/ManagerDashboard.css';
import './TerminologiesPage.css';
import './SalesCyclePage.css';

// "The Insurance Sales Cycle" training page. Shows the overview from the
// source training document, then an interactive wheel (Branding at the
// center, the 5 stages around it) - click any part to see its details
// below. Content lives in src/data/salesCycleContent.js.
const SalesCyclePage = () => {
  const [selectedKey, setSelectedKey] = useState(null);
  const selectedTopic = topics.find((t) => t.key === selectedKey) || null;

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <p className="header-subtitle">1Sang Banyuhay Financial Group</p>
          <h1 className="header-title">SALES CYCLE</h1>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">What This Cycle Is About</h2>
        {overview.intro.map((paragraph, i) => (
          <p key={i} className="sc-paragraph" style={{ marginTop: i === 0 ? 0 : '0.75rem' }}>
            {paragraph}
          </p>
        ))}

        <div className="sc-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="sc-table">
            <thead>
              <tr>
                {overview.stagesTable.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.stagesTable.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="sc-paragraph" style={{ marginTop: '1rem' }}>{overview.cycleNote}</p>

        <div className="sc-callout" style={{ marginTop: '0.85rem' }}>
          <div className="sc-block-label">Remember</div>
          <div className="sc-callout-text">{overview.remember}</div>
        </div>

        <div className="sc-callout" style={{ marginTop: '0.6rem' }}>
          <div className="sc-block-label">Core Principle</div>
          <div className="sc-callout-text">{overview.corePrinciple}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">The Cycle</h2>
        <p className="sc-hint">
          Click Branding at the center, or any of the five stages, to see why it matters and how it works.
        </p>

        <SalesCycleWheel topics={topics} selectedKey={selectedKey} onSelect={setSelectedKey} />

        {selectedTopic ? (
          <SalesCycleDetail topic={selectedTopic} />
        ) : (
          <div className="sc-empty-hint">Select a stage above to see its details.</div>
        )}
      </div>
    </div>
  );
};

export default SalesCyclePage;
