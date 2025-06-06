// frontend/frontend-app/src/pages/LoginPage.jsx
import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Will be used later for navigation

function LoginPage({ onLogin }) { // onLogin will be passed from App.jsx
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // const navigate = useNavigate(); // Will be used later

  const handleLogin = (e) => {
    e.preventDefault();
    // For now, any input is valid
    console.log('Attempting login with:', username, password);
    onLogin(); // Call the onLogin prop to update auth state in App.jsx
    // navigate('/dashboard'); // Navigation will be handled by App.jsx based on auth state
  };

  return (
    <div className="login-page-container">
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;
