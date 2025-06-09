// frontend/frontend-app/src/App.jsx
import React, { useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Import useLocation
import { SettingsContext } from './contexts/SettingsContext.jsx';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SplashScreen from './pages/SplashScreen';
import WalletsPage from './pages/WalletsPage';
import BudgetPlannerPage from './pages/BudgetPlannerPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import Header from './components/Header';
import Footer from './components/Footer';
import NavigationBar from './components/NavigationBar';
import AdBanner from './components/AdBanner';
import './App.css';

// Protected route wrapper
function ProtectedRoute({ children, isAuthenticated }) {
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// New AppContent component
function AppContent() {
  const location = useLocation();
  const { theme } = useContext(SettingsContext);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(false);
  const WORKER_URL = import.meta.env.VITE_WORKER_URL;

  const toggleNav = () => setIsNavVisible(prev => !prev);
  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => setIsAuthenticated(false);

  const isSplashScreen = location.pathname === '/';

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
      {/* Pass toggleNav only to Header, only show header if not splash screen OR if authenticated (adjust as needed) */}
      {!isSplashScreen && <Header onToggleNav={toggleNav} isLoggedIn={isAuthenticated} />}
      {/* Or, if header should always be there for logged-in users: */}
      {/* <Header onToggleNav={toggleNav} isLoggedIn={isAuthenticated} /> */}

      {/* NavigationBar will only receive visibility + logout */}

        {/* NavigationBar will only receive visibility + logout */}
      {isAuthenticated && (
        <NavigationBar
          isNavVisible={isNavVisible}
          handleLogout={handleLogout}
          onToggleNav={toggleNav}
          isLoggedIn={isAuthenticated}
        />
      )}

      <div style={{ flexGrow: 1, width: '100%', display: 'flex' }}>
        {/* Adjust paddingTop if header visibility changes */}
        <div style={{ flexGrow: 1, overflowY: 'auto', paddingTop: isAuthenticated && !isSplashScreen ? '56px' : '0px' }}>
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
                path="/"
              element={
                isAuthenticated ? <Navigate to="/dashboard" /> : <SplashScreen />
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>

      {/* Footer visibility can also be conditional */}
      {isAuthenticated && !isSplashScreen && <Footer />}

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
