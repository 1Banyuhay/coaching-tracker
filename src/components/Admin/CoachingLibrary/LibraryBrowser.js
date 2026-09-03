import React from 'react';
import { BookOpen } from 'lucide-react';
import '../Admin.css';

const LibraryBrowser = () => {
  return (
    <div className="library-browser">
      <div className="dashboard-header">
        <h1>Coaching Library Management</h1>
        <p>Manage categories, topics, and coaching items</p>
      </div>

      <div className="info-section">
        <BookOpen size={24} />
        <h2>Admin Library Management</h2>
        <p>
          In MVP, the coaching library is pre-populated with standard categories and topics:
        </p>
        <ul style={{ marginTop: '1rem' }}>
          <li>Product Familiarity</li>
          <li>FNA / FBB</li>
          <li>Client Conversation</li>
          <li>Tools</li>
          <li>New Business</li>
          <li>After Sales / Servicing</li>
          <li>Compliance</li>
          <li>Business Activity</li>
        </ul>
        <p style={{ marginTop: '1rem' }}>
          Full CRUD management for library items is planned for Phase 2.
        </p>
        <p>
          You can still modify the library by editing the database directly in Supabase.
        </p>
      </div>
    </div>
  );
};

export default LibraryBrowser;
