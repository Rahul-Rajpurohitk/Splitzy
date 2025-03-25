import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BrandPanel from './BrandPanel';
import '../login.css';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // States for success or error messages
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
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
    <div className="auth-container">
      <BrandPanel/>

      <div className="form-panel">
        <h2>Register</h2>

        {/* Display success or error messages */}
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleRegister}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            placeholder="Enter username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            placeholder="Enter email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            placeholder="Enter password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Sign Up</button>
        </form>

        <p className="switch-mode">
          Already have an account?
          <Link to="/"> Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
