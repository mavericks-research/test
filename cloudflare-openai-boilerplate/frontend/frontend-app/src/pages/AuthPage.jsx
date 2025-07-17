// frontend/frontend-app/src/pages/AuthPage.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsContext } from '../contexts/SettingsContext';
import './AuthPage.css';

const AuthPage = ({ workerUrl, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { theme } = useContext(SettingsContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const url = isLogin ? `${workerUrl}/api/login` : `${workerUrl}/api/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          onLogin(username);
          navigate('/dashboard');
        } else {
          setIsLogin(true);
        }
      } else {
        setError(data.error || 'An error occurred.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    }
  };

  return (
    <div className={`auth-page theme-${theme}`}>
      <div className="auth-container">
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="auth-button">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="toggle-button">
          {isLogin ? 'Need to create an account?' : 'Already have an account?'}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
