import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { reconnectSocket } from '../../socket';

const OAuth2RedirectHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchUserData = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');
            const error = params.get('error');

            if (token) {
                // Clear old session data first to prevent stale data issues
                localStorage.removeItem('splitzyToken');
                localStorage.removeItem('myUserId');
                localStorage.removeItem('myUserName');
                localStorage.removeItem('myUserEmail');
                localStorage.removeItem('myFriendIds');
                
                // Store token
                localStorage.setItem('splitzyToken', token);

                try {
                    // Fetch user details
                    const response = await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    const data = response.data;
                    console.log('[OAuth2] User data from /auth/me:', data);
                    console.log('[OAuth2] Storing myUserId:', data.id);
                    localStorage.setItem('myUserId', data.id);
                    localStorage.setItem('myUserName', data.name);
                    localStorage.setItem('myUserEmail', data.email);
                    if (data.friendIds) {
                        localStorage.setItem('myFriendIds', JSON.stringify(data.friendIds));
                    }

                    // Reconnect socket with new token
                    reconnectSocket();

                    // Redirect to home
                    navigate('/home');
                } catch (err) {
                    console.error('Failed to fetch user details', err);
                    navigate('/login?error=Failed to retrieve user details');
                }
            } else {
                navigate('/login?error=' + (error || 'Login failed'));
            }
        };

        fetchUserData();
    }, [location, navigate]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#0f172a' }}>Authenticating...</h2>
                <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default OAuth2RedirectHandler;

