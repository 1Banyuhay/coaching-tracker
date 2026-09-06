import React from 'react';
import './SalesCycleDetail.css';

// Renders one topic's content blocks. Each block has a "type" that maps to
// how it should look - see src/data/salesCycleContent.js for the block
// shapes (p, h, h3, bullets, numbered, quotes, compare, dialogue,
// postComparison, labeledQuotes, callout, table).
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
          <div className="sc-compare-col">
            <div className="sc-compare-label">{block.left.label}</div>
            <div className="sc-compare-text">{block.left.text}</div>
          </div>
          <div className="sc-compare-col">
            <div className="sc-compare-label">{block.right.label}</div>
            <div className="sc-compare-text">{block.right.text}</div>
          </div>
        </div>
      );

    case 'dialogue':
      return (
        <div className="sc-dialogue">
          {block.label && <div className="sc-block-label">{block.label}</div>}
          {block.lines.map((line, i) => (
            <div key={i} className={`sc-dialogue-line ${line.speaker === 'Client' ? 'client' : 'planner'}`}>
              <span className="sc-dialogue-speaker">{line.speaker}:</span> “{line.text}”
            </div>
          ))}
        </div>
      );

    case 'postComparison':
      return (
        <div className="sc-post-comparison">
          <div className="sc-block-label">Post Comparison</div>
          <div className="sc-post sc-post-generic">
            <div className="sc-post-tag">Generic</div>
            <div className="sc-post-text">“{block.generic}”</div>
          </div>
          <div className="sc-post sc-post-better">
            <div className="sc-post-tag">Better</div>
            <div className="sc-post-text">“{block.better}”</div>
          </div>
        </div>
      );

    case 'labeledQuotes':
      return (
        <div className="sc-labeled-quotes">
          {block.label && <div className="sc-block-label">{block.label}</div>}
          {block.items.map((item, i) => (
            <div key={i} className="sc-labeled-quote">
              <div className="sc-labeled-quote-label">{item.label}</div>
              <div className="sc-labeled-quote-text">“{item.text}”</div>
            </div>
          ))}
        </div>
      );

    case 'callout':
      return (
        <div className="sc-callout">
          {block.label && <div className="sc-block-label">{block.label}</div>}
          <div className="sc-callout-text">{block.text}</div>
        </div>
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
        <div className="sc-goal">
          <div className="sc-block-label">Goal</div>
          <div className="sc-goal-text">{topic.goal}</div>
        </div>
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
