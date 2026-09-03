import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

const Placeholder = ({ title, message, backLink }) => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
      <Briefcase size={64} style={{ color: '#d1d5db', margin: '0 auto 1rem', opacity: 0.5 }} />
      <h1>{title}</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        {message}
      </p>
      {backLink && (
        <button
          onClick={() => navigate(backLink)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          Go Back
        </button>
      )}
    </div>
  );
};

export default Placeholder;
