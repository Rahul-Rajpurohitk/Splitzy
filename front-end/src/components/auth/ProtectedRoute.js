// src/components/auth/ProtectedRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * ProtectedRoute - Authentication wrapper for protected pages
 *
 * Features:
 * - Validates token exists in localStorage
 * - Optionally validates token with backend
 * - Redirects to login with return URL preserved
 * - Shows loading state during validation
 *
 * Usage:
 *   <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
 */
function ProtectedRoute({ children, validateToken = false }) {
  const location = useLocation();

  // Get auth data synchronously on every render
  const token = localStorage.getItem('splitzyToken');
  const myUserId = localStorage.getItem('myUserId');

  // Simple synchronous check - no need for state/effects for basic auth
  const hasCredentials = !!(token && myUserId);

  // For token validation with backend (optional feature)
  const [isValidating, setIsValidating] = useState(validateToken && hasCredentials);
  const [tokenValid, setTokenValid] = useState(!validateToken); // assume valid if not validating

  useEffect(() => {
    // Only validate if requested and we have credentials
    if (!validateToken || !hasCredentials) {
      setIsValidating(false);
      return;
    }

    const validateAuth = async () => {
      try {
        await axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTokenValid(true);
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear invalid token
        localStorage.removeItem('splitzyToken');
        localStorage.removeItem('myUserId');
        localStorage.removeItem('myUserName');
        localStorage.removeItem('myUserEmail');
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAuth();
  }, [validateToken, hasCredentials, token]);

  // Still validating with backend
  if (isValidating) {
    return (
      <div className="auth-loading" data-testid="auth-loading">
        <div className="loading-spinner" />
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // Not authenticated - redirect to login with return URL
  if (!hasCredentials || (validateToken && !tokenValid)) {
    const returnUrl = location.pathname + location.search;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  // Authenticated - render children
  return children;
}

export default ProtectedRoute;
