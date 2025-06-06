// frontend/frontend-app/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // Removed useNavigate as it's not used directly in App.jsx for this change
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountPage from './pages/AccountPage';
import SplashScreen from './pages/SplashScreen'; // Import SplashScreen
import './App.css';

// WalletAnalyzer component (assuming it's still defined or imported if used by DashboardPage)
// Duplicating definition as per previous step, ideally this would be in its own file
function WalletAnalyzer({ workerUrl }) {
  const [walletAddress, setWalletAddress] = useState('');
  const [summary, setSummary] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      setError('Please enter a wallet address.');
      return;
    }
    setIsLoading(true);
    setError('');
    setSummary('');
    setTransactions([]);

    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Network response was not ok: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setSummary(data.summary || 'No summary returned.');
      setTransactions(data.transactionData || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2>Wallet Activity Analyzer</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter Ethereum Wallet Address"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Get Summary'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {summary && (
        <div>
          <h3>AI Summary:</h3>
          <p>{summary}</p>
        </div>
      )}
      {transactions.length > 0 && (
        <div>
          <h3>Transactions:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f4f4f4', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
            {JSON.stringify(transactions, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

// ProtectedRoute component (remains the same)
function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const WORKER_URL = 'http://localhost:8787'; // Default for local worker

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // Consider navigating to '/' or '/login' after logout if not handled by ProtectedRoute implicitly
    // For now, ProtectedRoute will handle redirection if on a protected page.
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <DashboardPage workerUrl={WORKER_URL} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <SplashScreen /> // Updated: Show SplashScreen if not authenticated
            }
          />
          <Route path="*" element={<Navigate to="/" />} /> {/* Catch-all redirects to home */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
