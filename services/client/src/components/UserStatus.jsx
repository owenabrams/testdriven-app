import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const UserStatus = ({ isAuthenticated }) => {
  const [userInfo, setUserInfo] = useState({
    email: '',
    id: '',
    username: '',
    active: '',
    admin: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getUserStatus = async () => {
    try {
      setLoading(true);
      const options = {
        url: `${process.env.REACT_APP_USERS_SERVICE_URL}/auth/status`,
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${window.localStorage.authToken}`
        }
      };
      
      const res = await axios(options);
      console.log(res.data.data);
      
      setUserInfo({
        email: res.data.data.email,
        id: res.data.data.id,
        username: res.data.data.username,
        active: String(res.data.data.active),
        admin: String(res.data.data.admin)
      });
      setError(null);
    } catch (error) {
      console.log(error);
      setError('Failed to fetch user status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      getUserStatus();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="columns is-centered">
          <div className="column is-half">
            <div className="notification is-warning">
              <p>You must be logged in to view this. Click <Link to="/login">here</Link> to log back in.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="columns is-centered">
          <div className="column is-half">
            <div className="notification is-info">
              <p>Loading user status...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="columns is-centered">
          <div className="column is-half">
            <div className="notification is-danger">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="columns is-centered">
        <div className="column is-half">
          <div className="box">
            <h1 className="title">User Status</h1>
            <ul>
              <li><strong>User ID:</strong> {userInfo.id}</li>
              <li><strong>Email:</strong> {userInfo.email}</li>
              <li><strong>Username:</strong> {userInfo.username}</li>
              <li><strong>Active:</strong> {userInfo.active}</li>
              <li><strong>Admin:</strong> {userInfo.admin}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatus;