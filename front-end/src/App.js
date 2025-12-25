import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import OAuth2RedirectHandler from './components/auth/OAuth2RedirectHandler';
import ErrorBoundary from './components/ErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './login.css';
import './home.css';
import Home from './components/Home';
import './output.css'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Redirect the default path to /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          {/* Simple /login route */}
          <Route path="/login" element={<Login />} />
          {/* Register page */}
          <Route path="/register" element={<Register />} />
          <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
          {/* Protected Home */}
          <Route path="/home" element={<Home />} />
        </Routes>
        {/* PWA Install Prompt - shows when app can be installed */}
        <PWAInstallPrompt />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
