import axios from 'axios';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../login.css';
import AuthLayout from './auth/AuthLayout';
import { reconnectSocket } from '../socket';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);  // To display error messages
  
  
  // Use useLocation to retrieve query parameters from the URL
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const successMessage = queryParams.get('message');

  const handleLogin = async (e) => {
    e.preventDefault();

    console.log('API URL:', process.env.REACT_APP_API_URL);


    try {
      // Post credentials to backend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/login`, 
        { email, password }
      );

      // The backend now returns a JSON object with { token, id, name, email } or { error: ... }
      const data = response.data;
      console.log("Login response data:", data);

      if (data.error) {
        // If there's an error field, show it
        setError(data.error);
      } else if (data.token) {
        // Clear old session data first to prevent stale data issues
        localStorage.removeItem('splitzyToken');
        localStorage.removeItem('myUserId');
        localStorage.removeItem('myUserName');
        localStorage.removeItem('myUserEmail');
        localStorage.removeItem('myFriendIds');
        
        // Store token + user details
        localStorage.setItem('splitzyToken', data.token);
        localStorage.setItem('myUserId', data.id);
        localStorage.setItem('myUserName', data.name);
        localStorage.setItem('myUserEmail', data.email);

        if(data.friendIds){
          localStorage.setItem('myFriendIds', JSON.stringify(data.friendIds));
        }

        // Reconnect socket with new token
        reconnectSocket();

        // Navigate to /home
        navigate('/home');
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <AuthLayout
      title="Sign in to Splitzy"
      subtitle="Track balances, settle up instantly, and keep every shared moment transparent."
      footnote={
        <>
          New here?{' '}
          <Link to="/register" className="muted-link">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="form-grid">
        {successMessage && (
          <div className="status-chip success-chip">{successMessage}</div>
        )}
        {error && <div className="status-chip error-chip">{error}</div>}

        <div className="input-field">
          <label htmlFor="email-input">Email address</label>
          <input
            type="email"
            id="email-input"
            name="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-field">
          <label htmlFor="password-input">Password</label>
          <input
            type="password"
            id="password-input"
            name="password"
            value={password}
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="input-hint">Minimum 8 characters to stay secure.</span>
        </div>

        <button type="submit" className="primary-btn">
          Continue to dashboard
        </button>

        <div className="divider">or continue with</div>
        <div className="social-grid">
          <button type="button" className="social-btn" onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/oauth2/authorization/google`}>
            {/* Google Icon SVG */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.52 12.32C23.52 11.53 23.45 10.77 23.32 10.04H12V14.7H18.45C18.17 16.19 17.33 17.47 16.08 18.31V21.32H19.95C22.21 19.24 23.52 16.17 23.52 12.32Z" fill="#4285F4"/>
                <path d="M12 24.0001C15.24 24.0001 17.96 22.9301 20 21.0501L16.13 18.0401C15.06 18.7801 13.67 19.2101 12 19.2101C8.87 19.2101 6.22 17.1001 5.27 14.2801H1.27V17.3801C3.26 21.3401 7.35 24.0001 12 24.0001Z" fill="#34A853"/>
                <path d="M5.27 14.2801C5.02 13.5201 4.89 12.7201 4.89 11.9001C4.89 11.0801 5.03 10.2801 5.27 9.52011V6.42011H1.27C0.46 8.03011 0 9.90011 0 11.9001C0 13.9001 0.46 15.7701 1.27 17.3801L5.27 14.2801Z" fill="#FBBC05"/>
                <path d="M12 4.59C13.76 4.59 15.33 5.2 16.57 6.38L19.99 2.96C17.96 1.07 15.24 0 12 0C7.35 0 3.26 2.66 1.27 6.62L5.27 9.72C6.22 6.9 8.87 4.59 12 4.59Z" fill="#EA4335"/>
            </svg>
            <span>Google</span>
          </button>
          <button type="button" className="social-btn">
            <span>Microsoft</span>
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Login;
