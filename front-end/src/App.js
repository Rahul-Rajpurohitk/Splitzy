import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import './login.css';
import './home.css';
import Home from './components/Home';
import './output.css'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect the default path to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Simple /login route */}
        <Route path="/login" element={<Login />} />
        {/* Register page */}
        <Route path="/register" element={<Register />} />
        {/* Protected Home */}
        <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
