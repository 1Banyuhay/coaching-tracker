import React from 'react';
import { X } from 'lucide-react';

// Generic drill-down modal opened by clicking any dashboard stat number.
// `columns`: [{ key, label, render?(row) }]
// `rows`: array of plain objects rendered one per table row.
const SummaryModal = ({ title, columns, rows, emptyMessage, onClose }) => {
  return (
    <div className="summary-modal-overlay" onClick={onClose}>
      <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summary-modal-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="summary-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="summary-modal-body">
          {rows.length === 0 ? (
            <div className="no-data">{emptyMessage || 'Nothing to show yet'}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
