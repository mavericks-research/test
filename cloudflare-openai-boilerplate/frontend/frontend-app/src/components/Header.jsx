import React from 'react';

function Header({ onToggleNav, isLoggedIn }) {

  const headerStyle = {
    width: '100%',
    backgroundColor: '#0d0d0d', // darker black
    color: '#26cc66', // vibrant green
    padding: '10px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 1010,
    borderBottom: '2px solid #26cc66',
  };

  const titleStyle = {
    margin: 0,
    fontSize: '1.6em',
    fontWeight: 'bold',
  };

  const toggleButtonStyle = {
    padding: '8px 15px',
    fontSize: '0.9em',
    cursor: 'pointer',
    backgroundColor: '#26cc66',
    color: '#0d0d0d',
    border: 'none',
    borderRadius: '4px',
    fontWeight: '600',
    transition: 'background-color 0.3s ease',
  };

  return (
    <header style={headerStyle}>
      <h4 style={titleStyle}>Coincept AI</h4>
      {isLoggedIn && (
        <button onClick={onToggleNav} style={toggleButtonStyle}>
          L
        </button>
      )}
    </header>
  );
}

export default Header;

