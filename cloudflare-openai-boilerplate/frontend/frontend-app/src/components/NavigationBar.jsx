// frontend/frontend-app/src/components/NavigationBar.jsx
import React from 'react'; // Removed useState
import { Link, useNavigate } from 'react-router-dom';

// Accept isNavVisible and handleLogout as props
function NavigationBar({ isNavVisible, handleLogout }) {
  const navigate = useNavigate();
  // Removed internal state and toggleNav function

  const navStyle = {
    background: '#333', // Darker background for the nav
    padding: '10px', // Uniform padding
    position: 'fixed', // Changed to fixed
    right: 0,          // Position to the right
    top: 0,            // Position to the top
    height: '100vh',   // Full height
    width: isNavVisible ? '250px' : '50px', // Dynamic width
    transition: 'width 0.3s ease', // Smooth transition for width change
    zIndex: 1000, // Ensure nav is above other content
    display: 'flex', // Using flex to align items
    flexDirection: 'column', // Stack items vertically
  };

  const toggleButtonStyle = {
    background: '#00d1ff',
    color: '#333',
    border: 'none',
    padding: '8px', // Adjusted padding
    margin: '10px 0', // Margin top/bottom, no side margin to fit better
    cursor: 'pointer',
    borderRadius: '5px',
    alignSelf: 'center', // Center button in collapsed nav
    textAlign: 'center', // Center text within the button
  };
  // Removed toggleButtonStyle as the button is removed

  const ulStyle = {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column', // Links stacked vertically
    alignItems: 'flex-start', // Align links to the start
    width: '100%', // Ensure ul takes full width of nav
  };
  const liStyle = {
    marginRight: '0', // Remove right margin, items are stacked
    marginBottom: '10px', // Add bottom margin for spacing
    width: '100%', // Ensure li takes full width for better clickability
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
    // marginLeft: 'auto', // No longer needed, parent li handles positioning
    color: '#ff4f81', // A different neon color for logout, e.g., pink/red
    width: '100%', // Make button take full width of its li container
    textAlign: 'left', // Align text to the left within the button
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
    // Render nav container only if isNavVisible is true, or always render and control visibility via CSS
    // For this iteration, let's keep the nav structure and rely on width to "hide" it.
    // Content (ul) will only be shown if isNavVisible is true (which also means width is '250px')
    <nav style={navStyle}>
      {/* Removed toggle button */}
      {isNavVisible && navStyle.width === '250px' && ( // Show links only when fully visible and expanded
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
          <li style={{ ...liStyle, marginTop: 'auto' }}> {/* Pushes logout to the bottom */}
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
