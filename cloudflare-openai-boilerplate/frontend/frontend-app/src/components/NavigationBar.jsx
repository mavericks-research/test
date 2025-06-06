// frontend/frontend-app/src/components/NavigationBar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate for logout

// Assuming handleLogout is passed as a prop from App.jsx if we implement actual logout
function NavigationBar({ handleLogout }) {
  const navigate = useNavigate();

  const navStyle = {
    background: '#333', // Darker background for the nav
    padding: '10px 20px',
    marginBottom: '20px',
    borderRadius: '5px',
  };
  const ulStyle = {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    alignItems: 'center', // Vertically align items
  };
  const liStyle = {
    marginRight: '20px',
  };
  const linkStyle = {
    textDecoration: 'none',
    color: '#00d1ff', // Neon blue/cyan for links
    fontWeight: 'bold',
    fontSize: '1.1em',
  };
  const logoutButtonStyle = {
    ...linkStyle, // Inherit link styling
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginLeft: 'auto', // Push logout to the far right
    color: '#ff4f81', // A different neon color for logout, e.g., pink/red
  };

  const onLogoutClick = () => {
    if (handleLogout) {
      handleLogout(); // Call the logout function passed from App.jsx
    }
    // App.jsx's ProtectedRoute will handle redirecting to /login
    // Or, we can explicitly navigate if needed: navigate('/login');
    console.log("Logout clicked");
  };

  return (
    <nav style={navStyle}>
      <ul style={ulStyle}>
        <li style={liStyle}>
          <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        </li>
        <li style={liStyle}>
          <Link to="/wallets" style={linkStyle}>Wallets</Link>
        </li>
        <li style={liStyle}>
          <Link to="/planner" style={linkStyle}>Planner</Link>
        </li>
        <li style={liStyle}>
          <Link to="/reports" style={linkStyle}>Reports</Link>
        </li>
        <li style={liStyle}>
          <Link to="/settings" style={linkStyle}>Settings</Link>
        </li>
        {/* Account link was there before, keeping it if distinct from settings, or merge as needed */}
        {/* For now, assuming 'Settings' covers 'Account' based on user's page list */}
        {/* <li style={liStyle}>
          <Link to="/account" style={linkStyle}>Account</Link>
        </li> */}
        <li style={{ ...liStyle, marginLeft: 'auto' }}> {/* Pushes logout to the right */}
          <button onClick={onLogoutClick} style={logoutButtonStyle}>
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default NavigationBar;
