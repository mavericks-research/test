// frontend/frontend-app/src/pages/SplashScreen.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import logo from '../assets/public.svg'


function SplashScreen() {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleGetStarted = () => {
    navigate('/login'); // Navigate to the login page
  };

  return (
    <div className="splash-screen-container">
      <img
        src={logo}
        alt="App Logo"
        style={{
          width: '150px',
          height: '150px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}
      />
      <h1>Know More. Plan Better. Grow Faster.</h1>
      <button onClick={handleGetStarted} style={{ fontSize: '1.2em', padding: '10px 20px' }}>
        Get Started
      </button>
    </div>
  );
}

export default SplashScreen;
