// frontend/frontend-app/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import './App.css';

// Protected route wrapper
function ProtectedRoute({ children, isAuthenticated }) {
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(false);
  const WORKER_URL = 'http://localhost:8787';

  const toggleNav = () => setIsNavVisible(prev => !prev);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => setIsAuthenticated(false);

  return (
    <BrowserRouter>
      <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Pass toggleNav only to Header */}
        <Header onToggleNav={toggleNav} />

        {/* NavigationBar will only receive visibility + logout */}
        {isAuthenticated && (
          <NavigationBar
            isNavVisible={isNavVisible}
            handleLogout={handleLogout}
          />
        )}

        <div style={{ flexGrow: 1, width: '100%', display: 'flex' }}>
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

        {isAuthenticated && <Footer />}
      </div>
    </BrowserRouter>
  );
}

export default App;
