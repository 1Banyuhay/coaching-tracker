import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Menu, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
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
      planner: 'Planner',
    };
    return labels[role] || role;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
        </div>

        <div className="navbar-content">
          {user && (
            <div className="user-info">
              <div className="user-details">
                <p className="user-name">
                  {user.full_name}
                </p>
                <p className="user-role">{getRoleLabel(user.role)}</p>
              </div>

              <button
                className="navbar-menu-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Menu size={20} />
              </button>

              {menuOpen && (
                <div className="navbar-dropdown">
                  <Link to="/account/password" className="logout-btn" onClick={() => setMenuOpen(false)}>
                    <KeyRound size={18} />
                    Change Password
                  </Link>
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
