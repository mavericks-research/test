// frontend/frontend-app/src/App.jsx
import React, { useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SettingsContext, SettingsProvider } from './contexts/SettingsContext.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import DashboardPage from './pages/DashboardPage';
import WalletsPage from './pages/WalletsPage';
import BudgetPlannerPage from './pages/BudgetPlannerPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage.jsx';
import Header from './components/Header';
import Footer from './components/Footer';
import NavigationBar from './components/NavigationBar';
import AdBanner from './components/AdBanner';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppContent() {
  const location = useLocation();
  const { theme } = useContext(SettingsContext);
  const { isAuthenticated } = useAuth();
  const [isNavVisible, setIsNavVisible] = useState(false);
  const WORKER_URL = import.meta.env.VITE_WORKER_URL;

  const toggleNav = () => setIsNavVisible(prev => !prev);

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
      {isAuthenticated && <Header onToggleNav={toggleNav} />}
      <AdBanner />
      {isAuthenticated && (
        <NavigationBar
          isNavVisible={isNavVisible}
          onToggleNav={toggleNav}
        />
      )}
      <div style={{ flexGrow: 1, width: '100%', display: 'flex' }}>
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingTop: isAuthenticated ? '56px' : '0' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={<ProtectedRoute><DashboardPage workerUrl={WORKER_URL} /></ProtectedRoute>}
            />
            <Route
              path="/wallets"
              element={<ProtectedRoute><WalletsPage /></ProtectedRoute>}
            />
            <Route
              path="/planner"
              element={<ProtectedRoute><BudgetPlannerPage /></ProtectedRoute>}
            />
            <Route
              path="/reports"
              element={<ProtectedRoute><ReportsPage /></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
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
      <SettingsProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
