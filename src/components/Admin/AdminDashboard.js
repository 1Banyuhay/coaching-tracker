import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users } from 'lucide-react';
import './Admin.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const quickLinks = [
    {
      icon: <BookOpen size={32} />,
      title: 'Coaching Library',
      description: 'Manage categories, topics, and coaching items',
      link: '/admin/library',
    },
    {
      icon: <Users size={32} />,
      title: 'User Management',
      description: 'Create users, manage roles, and assign reporting',
      link: '/admin/users',
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Administration Dashboard</h1>
        <p>Manage the coaching tracker system</p>
      </div>

      <div className="quick-links">
        {quickLinks.map((link, index) => (
          <button
            key={index}
            className="quick-link-card"
            onClick={() => navigate(link.link)}
          >
            <div className="link-icon">{link.icon}</div>
            <h3>{link.title}</h3>
            <p>{link.description}</p>
          </button>
        ))}
      </div>

      <div className="info-section">
        <h2>System Information</h2>
        <p>Version 0.1.0 (MVP)</p>
        <p>Planner Coaching & Development Tracker for 1Sang Banyuhay Financial Group</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
