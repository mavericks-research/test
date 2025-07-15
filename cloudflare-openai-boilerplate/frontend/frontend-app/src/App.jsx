// frontend/frontend-app/src/App.jsx
import React, { useState, useEffect, useContext } from 'react'; // Import useEffect
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Import useLocation
import { SettingsContext } from './contexts/SettingsContext.jsx';
import DashboardPage from './pages/DashboardPage';
import SplashScreen from './pages/SplashScreen';
import WalletsPage from './pages/WalletsPage';
import BudgetPlannerPage from './pages/BudgetPlannerPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import CoinDetailsPage from './pages/CoinDetailsPage'; // Import the CoinDetailsPage
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const WORKER_URL = import.meta.env.VITE_WORKER_URL;

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token') || localStorage.getItem('token');
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
    }
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000); // Reduced splash screen time

    return () => clearTimeout(timer);
  }, [location.search]);

  const toggleNav = () => setIsNavVisible(prev => !prev);

  if (isInitialLoading) {
    return <SplashScreen />;
  }

  return (
    <div
      className={`App theme-${theme}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        paddingBottom: '50px',
      }}
    >
      <Header onToggleNav={toggleNav} isLoggedIn={isAuthenticated} />
      <AdBanner />
      <NavigationBar
        isNavVisible={isNavVisible}
        onToggleNav={toggleNav}
        isLoggedIn={isAuthenticated}
      />
      <div style={{ flexGrow: 1, width: '100%', display: 'flex' }}>
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingTop: '56px' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <DashboardPage workerUrl={WORKER_URL} /> : <Navigate to="/login" />}
            />
            <Route
              path="/wallets"
              element={isAuthenticated ? <WalletsPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/planner"
              element={isAuthenticated ? <BudgetPlannerPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/reports"
              element={isAuthenticated ? <ReportsPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/settings"
              element={isAuthenticated ? <SettingsPage /> : <Navigate to="/login" />}
            />
            <Route path="/coin/:coinId" element={isAuthenticated ? <CoinDetailsPage /> : <Navigate to="/login" />} />
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
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
