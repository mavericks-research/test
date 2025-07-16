// frontend/frontend-app/src/App.jsx
import React, { useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SettingsContext } from './contexts/SettingsContext.jsx';
import DashboardPage from './pages/DashboardPage';
import WalletsPage from './pages/WalletsPage';
import BudgetPlannerPage from './pages/BudgetPlannerPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import Header from './components/Header';
import Footer from './components/Footer';
import NavigationBar from './components/NavigationBar';
import AdBanner from './components/AdBanner';
import './App.css';

function AppContent() {
  const location = useLocation();
  const { theme } = useContext(SettingsContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(false);
  const WORKER_URL = import.meta.env.VITE_WORKER_URL;

  const toggleNav = () => setIsNavVisible(prev => !prev);

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => setIsAuthenticated(false);

  return (
    <div
      className={`App theme-${theme}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingBottom: '50px',
        backgroundColor: !isAuthenticated ? 'transparent' : undefined,
      }}
    >
      {isAuthenticated && <Header onToggleNav={toggleNav} isLoggedIn={true} />}
      <AdBanner />

      {isAuthenticated && (
        <NavigationBar
          isNavVisible={isNavVisible}
          onToggleNav={toggleNav}
          isLoggedIn={true}
          onLogout={handleLogout}
        />
      )}

      <div style={{ flexGrow: 1, width: '100%', display: 'flex' }}>
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingTop: isAuthenticated ? '56px' : '0' }}>
          <Routes>
            {!isAuthenticated ? (
              <>
                <Route path="/auth" element={<AuthPage workerUrl={WORKER_URL} onLogin={handleLogin} />} />
                <Route path="*" element={<Navigate to="/auth" />} />
              </>
            ) : (
              <>
                <Route path="/dashboard" element={<DashboardPage workerUrl={WORKER_URL} />} />
                <Route path="/wallets" element={<WalletsPage />} />
                <Route path="/planner" element={<BudgetPlannerPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </>
            )}
          </Routes>
        </div>
      </div>

      <AdBanner />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
