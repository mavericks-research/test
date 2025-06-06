// frontend/frontend-app/src/components/NavigationBar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function NavigationBar() {
  const navStyle = {
    background: '#f0f0f0',
    padding: '10px',
    marginBottom: '20px',
  };
  const ulStyle = {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
  };
  const liStyle = {
    marginRight: '15px',
  };

  return (
    <nav style={navStyle}>
      <ul style={ulStyle}>
        <li style={liStyle}>
          <Link to="/dashboard">Dashboard</Link>
        </li>
        <li style={liStyle}>
          <Link to="/account">Account</Link>
        </li>
        {/* Add a logout link/button later if needed */}
      </ul>
    </nav>
  );
}

export default NavigationBar;
