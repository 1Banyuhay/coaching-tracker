import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Users, Settings, BookOpen, BookText, Link2, TrendingUp, Calculator, X } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ role }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const getMenuItems = () => {
    switch (role) {
      case 'senior_manager':
        return [
          {
            label: 'Dashboard',
            path: '/senior-manager/dashboard',
            icon: <BarChart3 size={20} />,
          },
          {
            label: 'Manage Team',
            path: '/senior-manager/team',
            icon: <Users size={20} />,
          },
          {
            label: 'Sales Cycle',
            path: '/sales-cycle',
            icon: <TrendingUp size={20} />,
          },
          {
            label: 'Income Simulation',
            path: '/income-simulation',
            icon: <Calculator size={20} />,
          },
          {
            label: 'Terminologies',
            path: '/terminologies',
            icon: <BookText size={20} />,
          },
          {
            label: 'Useful Links',
            path: '/links',
            icon: <Link2 size={20} />,
          },
        ];

      case 'manager':
        return [
          {
            label: 'Dashboard',
            path: '/manager/dashboard',
            icon: <BarChart3 size={20} />,
          },
          {
            label: 'My Planners',
            path: '/manager/planners',
            icon: <Users size={20} />,
          },
          {
            label: 'Sales Cycle',
            path: '/sales-cycle',
            icon: <TrendingUp size={20} />,
          },
          {
            label: 'Income Simulation',
            path: '/income-simulation',
            icon: <Calculator size={20} />,
          },
          {
            label: 'Terminologies',
            path: '/terminologies',
            icon: <BookText size={20} />,
          },
          {
            label: 'Useful Links',
            path: '/links',
            icon: <Link2 size={20} />,
          },
        ];

      case 'planner':
        return [
          {
            label: 'Dashboard',
            path: '/planner/dashboard',
            icon: <BarChart3 size={20} />,
          },
          {
            label: 'Sales Cycle',
            path: '/sales-cycle',
            icon: <TrendingUp size={20} />,
          },
          {
            label: 'Income Simulation',
            path: '/income-simulation',
            icon: <Calculator size={20} />,
          },
          {
            label: 'Terminologies',
            path: '/terminologies',
            icon: <BookText size={20} />,
          },
          {
            label: 'Useful Links',
            path: '/links',
            icon: <Link2 size={20} />,
          },
        ];

      case 'admin':
        return [
          {
            label: 'Dashboard',
            path: '/admin/dashboard',
            icon: <BarChart3 size={20} />,
          },
          {
            label: 'Coaching Topics',
            path: '/admin/library',
            icon: <BookOpen size={20} />,
          },
          {
            label: 'Manage Team',
            path: '/senior-manager/team',
            icon: <Users size={20} />,
          },
          {
            label: 'Settings',
            path: '/admin/settings',
            icon: <Settings size={20} />,
          },
          {
            label: 'Sales Cycle',
            path: '/sales-cycle',
            icon: <TrendingUp size={20} />,
          },
          {
            label: 'Income Simulation',
            path: '/income-simulation',
            icon: <Calculator size={20} />,
          },
          {
            label: 'Terminologies',
            path: '/terminologies',
            icon: <BookText size={20} />,
          },
          {
            label: 'Useful Links',
            path: '/links',
            icon: <Link2 size={20} />,
          },
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-close">
          <button onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </>
  );
};

export default Sidebar;
