import React from 'react';
import './SalesCycleDetail.css';

// Renders one topic's content blocks. Each block has a "type" that maps to
// how it should look - see src/data/salesCycleContent.js for the block
// shapes (p, h, h3, bullets, numbered, quotes, compare, dialogue,
// postComparison, labeledQuotes, callout, table). Plain paragraph-style
// blocks (goal, callout, quotes, dialogue, postComparison, labeledQuotes,
// compare) are unboxed - just a bold/uppercase inline label followed by
// the text, no borders or background.
const Block = ({ block }) => {
  switch (block.type) {
    case 'p':
      return <p className="sc-paragraph">{block.text}</p>;

    case 'h':
      return <h3 className="sc-subheading">{block.text}</h3>;

    case 'h3':
      return <h4 className="sc-subsubheading">{block.text}</h4>;

    case 'bullets':
      return (
        <ul className="sc-bullets">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case 'numbered':
      return (
        <ol className="sc-numbered">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );

    case 'quotes':
      return (
        <ul className="sc-quotes">
          {block.items.map((item, i) => (
            <li key={i}>“{item}”</li>
          ))}
        </ul>
      );

    case 'compare':
      return (
        <div className="sc-compare">
          <p className="sc-paragraph">
            <span className="sc-label">{block.left.label}:</span> {block.left.text}
          </p>
          <p className="sc-paragraph">
            <span className="sc-label">{block.right.label}:</span> {block.right.text}
          </p>
        </div>
      );

    case 'dialogue':
      return (
        <div className="sc-dialogue">
          {block.label && <p className="sc-label-line">{block.label}</p>}
          {block.lines.map((line, i) => (
            <p key={i} className="sc-paragraph sc-dialogue-line">
              <span className="sc-label">{line.speaker}:</span> “{line.text}”
            </p>
          ))}
        </div>
      );

    case 'postComparison':
      return (
        <div className="sc-post-comparison">
          <p className="sc-label-line">Post Comparison</p>
          <p className="sc-paragraph">
            <span className="sc-label">Generic:</span> “{block.generic}”
          </p>
          <p className="sc-paragraph">
            <span className="sc-label">Better:</span> “{block.better}”
          </p>
        </div>
      );

    case 'labeledQuotes':
      return (
        <div className="sc-labeled-quotes">
          {block.label && <p className="sc-label-line">{block.label}</p>}
          {block.items.map((item, i) => (
            <p key={i} className="sc-paragraph">
              <span className="sc-label">{item.label}:</span> “{item.text}”
            </p>
          ))}
        </div>
      );

    case 'callout':
      return (
        <p className="sc-paragraph">
          {block.label && <span className="sc-label">{block.label}: </span>}
          {block.text}
        </p>
      );

    case 'table':
      return (
        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
};

const SalesCycleDetail = ({ topic }) => {
  if (!topic) return null;

  return (
    <div className="sales-cycle-detail" style={{ '--topic-color': topic.color }}>
      <div className="sc-detail-header">
        <h2 className="sc-detail-title">{topic.label}</h2>
        {topic.tagline && <p className="sc-detail-tagline">{topic.tagline}</p>}
      </div>

      {topic.goal && (
        <p className="sc-paragraph sc-goal-line">
          <span className="sc-label">GOAL:</span> {topic.goal}
        </p>
      )}

      <div className="sc-detail-body">
        {topic.sections.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </div>
  );
};

export default SalesCycleDetail;
