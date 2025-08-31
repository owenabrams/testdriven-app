import React, { Component } from 'react';
import offlineAuthService from '../services/offlineAuthService';
import networkStatus from '../services/networkStatus';

class AuthComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLogin: true,
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      isLoading: false,
      error: null,
      isOnline: networkStatus.getStatus()
    };
    
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.toggleMode = this.toggleMode.bind(this);
  }

  componentDidMount() {
    // Subscribe to network status
    this.networkUnsubscribe = networkStatus.subscribe((isOnline) => {
      this.setState({ isOnline });
    });
  }

  componentWillUnmount() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
  }

  handleInputChange(event) {
    const { name, value } = event.target;
    this.setState({ [name]: value, error: null });
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    const { isLogin, username, email, password, confirmPassword } = this.state;
    
    // Validation
    if (!username || !password) {
      this.setState({ error: 'Username and password are required' });
      return;
    }
    
    if (!isLogin) {
      if (!email) {
        this.setState({ error: 'Email is required for registration' });
        return;
      }
      if (password !== confirmPassword) {
        this.setState({ error: 'Passwords do not match' });
        return;
      }
    }

    this.setState({ isLoading: true, error: null });

    try {
      if (isLogin) {
        // Login
        const result = await offlineAuthService.login({ username, password });
        console.log('Login successful:', result);
        
        // Clear form
        this.setState({
          username: '',
          password: '',
          isLoading: false
        });
        
        // Notify parent component
        if (this.props.onAuthSuccess) {
          this.props.onAuthSuccess(result.user);
        }
      } else {
        // Register
        const result = await offlineAuthService.register({
          username,
          email,
          password
        });
        console.log('Registration successful:', result);
        
        // Clear form
        this.setState({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          isLoading: false
        });
        
        // Notify parent component
        if (this.props.onAuthSuccess) {
          this.props.onAuthSuccess(result.user);
        }
      }
    } catch (error) {
      this.setState({
        error: error.message,
        isLoading: false
      });
    }
  }

  toggleMode() {
    this.setState(prevState => ({
      isLogin: !prevState.isLogin,
      error: null,
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }));
  }

  render() {
    const { 
      isLogin, 
      username, 
      email, 
      password, 
      confirmPassword, 
      isLoading, 
      error, 
      isOnline 
    } = this.state;

    return (
      <div className="box">
        <h2 className="title is-4">
          {isLogin ? '🔐 Login' : '👤 Register'}
          {!isOnline && (
            <span className="tag is-warning is-small ml-2">
              📱 Offline Mode
            </span>
          )}
        </h2>

        {!isOnline && (
          <div className="notification is-info is-light">
            <strong>Offline Authentication:</strong> You can login or register offline. 
            Your account will be synced when you're back online.
          </div>
        )}

        {error && (
          <div className="notification is-danger is-light">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={this.handleSubmit}>
          {/* Username Field */}
          <div className="field">
            <label className="label">Username</label>
            <div className="control has-icons-left">
              <input
                className="input"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={username}
                onChange={this.handleInputChange}
                required
              />
              <span className="icon is-small is-left">
                <i className="fas fa-user"></i>
              </span>
            </div>
          </div>

          {/* Email Field (Registration only) */}
          {!isLogin && (
            <div className="field">
              <label className="label">Email</label>
              <div className="control has-icons-left">
                <input
                  className="input"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={this.handleInputChange}
                  required
                />
                <span className="icon is-small is-left">
                  <i className="fas fa-envelope"></i>
                </span>
              </div>
            </div>
          )}

          {/* Password Field */}
          <div className="field">
            <label className="label">Password</label>
            <div className="control has-icons-left">
              <input
                className="input"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={this.handleInputChange}
                required
              />
              <span className="icon is-small is-left">
                <i className="fas fa-lock"></i>
              </span>
            </div>
          </div>

          {/* Confirm Password Field (Registration only) */}
          {!isLogin && (
            <div className="field">
              <label className="label">Confirm Password</label>
              <div className="control has-icons-left">
                <input
                  className="input"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={this.handleInputChange}
                  required
                />
                <span className="icon is-small is-left">
                  <i className="fas fa-lock"></i>
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="field">
            <div className="control">
              <button
                className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
                type="submit"
                disabled={isLoading}
              >
                {isLogin ? '🔐 Login' : '👤 Register'}
              </button>
            </div>
          </div>
        </form>

        {/* Toggle Mode */}
        <div className="has-text-centered mt-4">
          <button
            className="button is-text"
            onClick={this.toggleMode}
            disabled={isLoading}
          >
            {isLogin 
              ? "Don't have an account? Register here" 
              : "Already have an account? Login here"
            }
          </button>
        </div>

        {/* Offline Features Info */}
        {!isOnline && (
          <div className="notification is-light mt-4">
            <h5 className="title is-6">📱 Offline Features:</h5>
            <ul>
              <li>✅ Create account offline</li>
              <li>✅ Login with cached credentials</li>
              <li>✅ Auto-sync when online</li>
              <li>✅ Secure local storage</li>
            </ul>
          </div>
        )}
      </div>
    );
  }
}

export default AuthComponent;
