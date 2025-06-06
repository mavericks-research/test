// frontend/frontend-app/src/components/Header.jsx
import React from 'react';

function Header({ onToggleNav }) { // Accept onToggleNav prop
  const headerStyle = {
    width: '100%',
    backgroundColor: '#f0f0f0', // Light grey background
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box', // Ensures padding doesn't add to the width
    position: 'sticky', // Make header sticky
    top: '0', // Stick to the top
    zIndex: 1010, // Ensure it's above other content like NavigationBar (zIndex 1000)
  };

  const titleStyle = {
    margin: 0, // Removes default margin from h1
    fontSize: '1.5em',
  };

  const toggleButtonStyle = {
    padding: '8px 15px',
    fontSize: '0.9em',
    cursor: 'pointer',
    // Basic button styling, can be enhanced later
  };

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>My App</h1>
      <button onClick={onToggleNav} style={toggleButtonStyle}> {/* Attach onToggleNav */}
        Toggle Nav
      </button>
    </header>
  );
}

export default Header;
