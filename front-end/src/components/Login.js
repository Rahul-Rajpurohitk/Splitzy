import axios from 'axios';
import React, { useState } from 'react';
import {  Link, useLocation, useNavigate} from 'react-router-dom';
import '../login.css'; // If not imported globally
import BrandPanel from './BrandPanel';

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
        // Store token + user details
        localStorage.setItem('splitzyToken', data.token);
        localStorage.setItem('myUserId', data.id);
        localStorage.setItem('myUserName', data.name);
        localStorage.setItem('myUserEmail', data.email);

        if(data.friendIds){
          localStorage.setItem('myFriendIds', JSON.stringify(data.friendIds));
        }

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
    <div className="auth-container">
      <BrandPanel />
      <div className="form-panel">
        <h2>Login</h2>
        {/* Display the success message passed as a query parameter, if any */}
        {successMessage && <p className="success">{successMessage}</p>}
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleLogin}>
          <label htmlFor="email-input">Email</label>
          <input
            type="email"
            id="email-input"
            name="email"
            value={email}
            placeholder="Enter email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password-input">Password</label>
          <input
            type="password"
            id="password-input"
            name="password"
            value={password}
            placeholder="Enter password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p className="switch-mode">
          Create an account? 
          <Link to="/register"> Register</Link>
          
        </p>
      </div>
    </div>
  );
}

export default Login;
