import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
//import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import Friends from './Friends';
import Notification from './Notification';
import SplitzySocket from './SplitzySocket';
//import { closeSocket } from '../features/socket/socketSlice';
import socket from '../socket'; // <-- IMPORT the socket directly
import ExpenseCenter from './expenses/ExpenseCenter';
import '../home.css';

function Home() {
  const navigate = useNavigate();
  //const dispatch = useDispatch();
  //const { connected } = useSelector((state) => state.socket);

  useEffect(() => {
    const token = localStorage.getItem('splitzyToken');
    if (!token) {
      navigate('/login');
      return;
    }

    axios
      .get(`${process.env.REACT_APP_API_URL}/home`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (response.status === 200 && response.data === 'Authorized') {
          console.log('You are authorized to view this page!');
        }
      })
      .catch((error) => {
        console.error('Error accessing /home:', error);
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    // Close WebSocket before logging out
    socket.disconnect();

    localStorage.removeItem('splitzyToken');
    localStorage.removeItem('myUserId');
    localStorage.removeItem('myUserName');
    localStorage.removeItem('myUserEmail');
    
    window.location.href = '/login';
  };

  const username = localStorage.getItem('myUserName');

  return (
    <div className="app-container">
      <SplitzySocket />

      <header className="topbar">
        <div className="brand">Splitzy</div>
        <div className="user-info">
          <Notification />
          <span>{username}</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <Friends />
        </aside>

        <section className="center-panel">
          {/* Could show statusMessage if you want */}
          <ExpenseCenter />
        </section>

        <aside className="right-panel">
          <div className="promo-box">
            <h3>50% off</h3>
            <p>1 year of Splitzy Pro</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Home;
