// frontend/frontend-app/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AccountPage from './pages/AccountPage';
import './App.css'; // Assuming this file exists for basic styles

// Placeholder for the original content of App.jsx if it needs to be moved
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


// ProtectedRoute component to handle authentication checks
function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Or load from localStorage

  // Replace with your actual worker URL:
  const WORKER_URL = 'http://localhost:8787'; // Default for local worker, update if needed

  const handleLogin = () => {
    setIsAuthenticated(true);
    // In a real app, you might store a token in localStorage here
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // In a real app, you might remove a token from localStorage here
    // No explicit navigation needed here as ProtectedRoute will handle it.
  };

  // This effect will run when `isAuthenticated` changes.
  // If we just logged out, and we are on a protected route, this setup
  // with ProtectedRoute will automatically redirect to /login.
  // If we want to explicitly navigate to /login on logout, that can be added to handleLogout.

  return (
    <BrowserRouter>
      <div className="App">
        {/* NavigationBar could be placed here if it should be visible on all pages including login,
            or inside DashboardPage/AccountPage if only for authenticated users.
            The plan was to put it inside DashboardPage/AccountPage.
            We can add a logout button to the NavigationBar later.
        */}
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
                {/* Pass WORKER_URL to DashboardPage if it needs to host WalletAnalyzer */}
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
              isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            }
          />
          <Route path="*" element={<Navigate to="/" />} /> {/* Catch-all redirects to home */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// Update DashboardPage to include the WalletAnalyzer logic
// This requires modifying DashboardPage.jsx as well.
// For now, this subtask will focus on App.jsx.
// A follow-up subtask will move WalletAnalyzer into DashboardPage.jsx.

export default App;
