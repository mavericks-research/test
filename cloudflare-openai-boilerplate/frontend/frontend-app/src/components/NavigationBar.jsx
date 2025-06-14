import React from 'react';
import { Link } from 'react-router-dom';

function NavigationBar({ isNavVisible, onToggleNav }) {

  const navStyle = {
    background: '#0f0f0f',
    padding: '10px',
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    width: isNavVisible ? '250px' : '0px',
    transition: 'width 0.3s ease',
    zIndex: 1000,
    display: isNavVisible ? 'flex' : 'none',  // <-- toggle display
    flexDirection: 'column',
    alignItems: 'center',
    borderLeft: '2px solid #1ac0ff',
  };


  const toggleButtonStyle = {
    background: '#1ac0ff',
    color: '#0f0f0f',
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
    color: '#80eaff', // Laser blue link
    fontWeight: 'bold',
    fontSize: '1.1em',
    paddingLeft: '0px',
    transition: 'color 0.2s',
  };

  return (
    <nav style={navStyle}>
      <button onClick={onToggleNav} style={toggleButtonStyle}>
        {isNavVisible ? '←' : '→'}
      </button>

      {isNavVisible && (
        <ul style={ulStyle}>
          <li style={liStyle}>
            <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
          </li>


          <li style={liStyle}>
            <Link to="/settings" style={linkStyle}>Settings</Link>
          </li>

          {/*
                    <li style={liStyle}>
            <Link to="/wallets" style={linkStyle}>Wallets</Link>
          </li>
          <li style={liStyle}>
            <Link to="/planner" style={linkStyle}>Planner</Link>
          </li>
          <li style={liStyle}>
            <Link to="/reports" style={linkStyle}>Reports</Link>
          </li>
         
          */}

        </ul>
      )}
    </nav>
  );
}

export default NavigationBar;
