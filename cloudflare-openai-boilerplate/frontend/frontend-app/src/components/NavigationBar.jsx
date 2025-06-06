import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function NavigationBar({ isNavVisible, handleLogout, onToggleNav, isLoggedIn }) {

  const navigate = useNavigate();

  const navStyle = {
    background: '#0d0d0d', // Black background
    padding: '10px',
    position: 'fixed',
    right: 0,
    top: 0,
    height: '100vh',
    width: isNavVisible ? '250px' : '50px',
    transition: 'width 0.3s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderLeft: '2px solid #26cc66', // subtle green accent border
  };

  const toggleButtonStyle = {
    background: '#26cc66',
    color: '#0d0d0d',
    border: 'none',
    padding: '8px',
    margin: '10px 0',
    cursor: 'pointer',
    borderRadius: '5px',
    width: '30px',
    height: '30px',
    fontSize: '1.2em',
    fontWeight: 'bold',
  };

  const ulStyle = {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  };

  const liStyle = {
    marginBottom: '10px',
    width: '100%',
  };

  const linkStyle = {
    textDecoration: 'none',
    color: '#38ff88',
    fontWeight: 'bold',
    fontSize: '1.1em',
    paddingLeft: '10px',
    transition: 'color 0.2s',
  };

  const logoutButtonStyle = {
    ...linkStyle,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ff4f81',
    width: '100%',
    textAlign: 'left',
  };

  const onLogoutClick = () => {
    if (handleLogout) {
      handleLogout();
    }
    console.log("Logout clicked");
  };

  return (
    <nav style={navStyle}>
      {isLoggedIn && (
        <button onClick={onToggleNav} style={toggleButtonStyle}>
          {isNavVisible ? '←' : '→'}
        </button>
      )}

      {isNavVisible && (
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
          <li style={{ ...liStyle, marginTop: 'auto' }}>
            <button onClick={onLogoutClick} style={logoutButtonStyle}>
              Logout
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}

export default NavigationBar;
