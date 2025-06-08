// frontend/frontend-app/src/pages/SplashScreen.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

function SplashScreen() {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleGetStarted = () => {
    navigate('/login'); // Navigate to the login page
  };

  // Placeholder logo (using Lorem Picsum for a random image)
  const logoUrl = 'https://picsum.photos/seed/applogo/150/150';

  return (
    <div className="splash-screen-container">
      <img
        src={logoUrl}
        alt="App Logo"
        style={{
          width: '150px',
          height: '150px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}
      />
      <h1>See Your Crypto. Plan Your Future.</h1>
      <button onClick={handleGetStarted} style={{ fontSize: '1.2em', padding: '10px 20px' }}>
        Get Started
      </button>
    </div>
  );
}

export default SplashScreen;
