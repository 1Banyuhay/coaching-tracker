import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Menu } from 'lucide-react';
import toast from 'react-hot-toast';
import './Navbar.css';

const Navbar = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      senior_manager: 'Senior Manager',
      manager: 'Manager',
      planner: 'Financial Planner',
    };
    return labels[role] || role;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
        </div>

        <div className="navbar-content">
          {profile && (
            <div className="user-info">
              <div className="user-details">
                <p className="user-name">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="user-role">{getRoleLabel(profile.role)}</p>
              </div>

              <button
                className="navbar-menu-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Menu size={20} />
              </button>

              {menuOpen && (
                <div className="navbar-dropdown">
                  <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
