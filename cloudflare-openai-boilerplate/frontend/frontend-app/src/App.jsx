// frontend/frontend-app/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
// import AccountPage from './pages/AccountPage'; // Replaced by SettingsPage
import SplashScreen from './pages/SplashScreen';
import WalletsPage from './pages/WalletsPage';
import BudgetPlannerPage from './pages/BudgetPlannerPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import Header from './components/Header';
import Footer from './components/Footer';
import NavigationBar from './components/NavigationBar'; // Import NavigationBar
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
  const [isNavVisible, setIsNavVisible] = useState(true); // State for Nav visibility
  const WORKER_URL = 'http://localhost:8787'; // Default for local worker

  const toggleNav = () => { // Function to toggle Nav visibility
    setIsNavVisible(prev => !prev);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    // User will be redirected by ProtectedRoute if on a protected page.
    // If they are on a non-protected page (e.g. /splash if we had logout there),
    // they would stay. Explicit navigation can be added if needed:
    // navigate('/login'); // Would require useNavigate hook in App component
  };

  // Helper to pass props to children of ProtectedRoute
  const wrapWithProps = (element, props) => {
    return React.cloneElement(element, props);
  };

  return (
    <BrowserRouter>
      <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Pass onToggleNav to Header. Render NavigationBar only if authenticated. */}
        {isAuthenticated && <Header onToggleNav={toggleNav} />}
        {isAuthenticated && <NavigationBar isNavVisible={isNavVisible} handleLogout={handleLogout} />}
        <div style={{ flexGrow: 1, width: '100%', display: 'flex' }}> {/* Content wrapper now also a flex container */}
          {/* Potential: Add a sidebar div here if NavigationBar is not 'fixed' but part of flow */}
          {/* Main content area: Added paddingTop if authenticated for sticky header */}
          <div style={{ flexGrow: 1, overflowY: 'auto', paddingTop: isAuthenticated ? '56px' : '0px' }}>
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
                  {/* Remove handleLogout from page props if Nav handles it */}
                  <DashboardPage workerUrl={WORKER_URL} />
                </ProtectedRoute>
              }
            />
            {/* <Route
              path="/account" // Route removed as per NavigationBar change, SettingsPage takes over
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <AccountPage />
                </ProtectedRoute>
              }
            /> */}
            <Route
              path="/wallets"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <WalletsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <BudgetPlannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
            path="/planner"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <BudgetPlannerPage handleLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ReportsPage handleLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <SettingsPage handleLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/dashboard" /> : <SplashScreen />
              }
            />
            <Route path="*" element={<Navigate to="/" />} /> {/* Catch-all redirects to home */}
            </Routes>
          </div>
        </div>
        {isAuthenticated && <Footer />} {/* Render Footer only if authenticated */}
      </div>
    </BrowserRouter>
  );
}

export default App;
