// frontend/frontend-app/src/App.jsx
import React, { useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Import useLocation
import { SettingsContext } from './contexts/SettingsContext.jsx';
import DashboardPage from './pages/DashboardPage';
import SplashScreen from './pages/SplashScreen';
import WalletsPage from './pages/WalletsPage';
import BudgetPlannerPage from './pages/BudgetPlannerPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CoinDetailsPage from './pages/CoinDetailsPage'; // Import the CoinDetailsPage
import Header from './components/Header';
import Footer from './components/Footer';
import NavigationBar from './components/NavigationBar';
import AdBanner from './components/AdBanner';
import './App.css';

// New AppContent component
function AppContent() {
  const location = useLocation();
  const { theme } = useContext(SettingsContext);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // isAuthenticated by default
  const [isNavVisible, setIsNavVisible] = useState(false);
  const WORKER_URL = import.meta.env.VITE_WORKER_URL;

  const toggleNav = () => setIsNavVisible(prev => !prev);

  const isSplashScreen = location.pathname === '/'; // This will effectively be unused

  return (
    <div
      className={`App theme-${theme}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingBottom: '50px', // Add padding to the bottom to prevent content overlap by adbanner
        backgroundColor: isSplashScreen ? 'transparent' : undefined
      }}
    >
      {/* Header is always shown as user is authenticated */}
      <Header onToggleNav={toggleNav} isLoggedIn={true} />
      <AdBanner />

      {/* NavigationBar is always shown as user is authenticated */}
      <NavigationBar
        isNavVisible={isNavVisible}
        onToggleNav={toggleNav}
        isLoggedIn={true}
      />

      <div style={{ flexGrow: 1, width: '100%', display: 'flex' }}>
        {/* Adjust paddingTop; effectively always 56px as splash screen is removed */}
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingTop: '56px' }}>
          <Routes>
            <Route path="/login" element={<Navigate to="/dashboard" />} />
            <Route
              path="/dashboard"
              element={<DashboardPage workerUrl={WORKER_URL} />}
            />
            <Route
              path="/wallets"
              element={<WalletsPage />}
            />
            <Route
              path="/planner"
              element={<BudgetPlannerPage />}
            />
            <Route
              path="/reports"
              element={<ReportsPage />}
            />
            <Route
              path="/settings"
              element={<SettingsPage />}
            />
            <Route path="/coin/:coinId" element={<CoinDetailsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} /> {/* Default to dashboard */}
          </Routes>
        </div>
      </div>

      {/* Ad Banner to be displayed at the bottom */}
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
