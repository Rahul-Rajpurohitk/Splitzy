import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../login.css';
import AuthLayout from './auth/AuthLayout';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // States for success or error messages
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    // 1. Password Match Check
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // 2. Strong Password Validation (Length + Complexity)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      setError("Password must be at least 8 chars with uppercase, lowercase, number & symbol.");
      return;
    }

    // 3. Basic SQL Injection Sanitization (for Username)
    //    Ideally, the backend should handle this, but checking for common malicious chars here adds a layer.
    //    We allow single hyphens (names like "Anne-Marie") but block double hyphens (comments).
    const sqlInjectionPattern = /['";]|--/;
    if (sqlInjectionPattern.test(username)) {
      setError("Username contains invalid characters.");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/signup`, 
        {
          // The backend expects a "User" object with: name, email, password
          name: username,
          email: email,
          password: password
        }
      );

      // The backend typically responds with:
      // "Verification email sent. Please verify your email to complete the registration."
      const backendMessage = response.data;
      setMessage(backendMessage);
      setError(null);

      // Redirect to the login page with a success message as a query parameter
      navigate(
        '/login?message=' +
          encodeURIComponent(
            'Registration successful. Please check your email to verify your account.'
          )
      );
    } catch (err) {
      console.error('Registration error:', err);

      // If the backend returns something like "Email already in use", store it in 'error'
      if (err.response && err.response.data) {
        setError(err.response.data);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setMessage(null);
    }
  };

  return (
    <AuthLayout
      title="Create your Splitzy space"
      subtitle="Invite friends, spin up groups, and never lose track of who paid for what again."
      footnote={
        <>
          Already part of the crew?{' '}
          <Link to="/login" className="muted-link">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleRegister} className="form-grid">
        {message && <div className="status-chip success-chip">{message}</div>}
        {error && <div className="status-chip error-chip">{error}</div>}

        <div className="input-field">
          <label>Full name</label>
          <input
            type="text"
            value={username}
            placeholder="Avery Johnson"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="input-field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            placeholder="Choose a secure password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="input-hint">
            Use at least 8 characters with numbers & symbols.
          </span>
        </div>

        <div className="input-field">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            placeholder="Re-enter your password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="primary-btn">
          Verify & continue
        </button>

        <div className="divider">or start with</div>
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
            <span>Apple</span>
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Register;
