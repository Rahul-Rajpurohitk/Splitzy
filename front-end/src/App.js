import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import OAuth2RedirectHandler from './components/auth/OAuth2RedirectHandler';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './login.css';
import './home.css';
import Home from './components/Home';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import './output.css'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Redirect the default path to /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
          {/* Protected routes */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          {/* Catch-all redirect for unknown routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        {/* PWA Install Prompt - shows when app can be installed */}
        <PWAInstallPrompt />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
