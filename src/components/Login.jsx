import { useState } from 'react';
import Button from './Button';
import { LoadingSpinner } from './icons';
import { getApiUrl } from '../config/api';
import './Login.css';

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = getApiUrl();

      console.log('Login: Attempting login to:', `${apiUrl}/api/auth/login`);

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, rememberMe }),
      });

      console.log('Login: Response status:', response.status);

      const data = await response.json();
      console.log('Login: Response data:', data);

      if (response.ok && data.token) {
        // Store token and notify parent
        localStorage.setItem('access_token', data.token);
        localStorage.setItem('token_expires_at', data.expiresAt);
        localStorage.setItem('remember_me', data.rememberMe);
        onLogin(data.token);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Failed to connect to server: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>HomeDash</h1>
          <p>Please enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="login-input"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="login-checkbox-group">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Remember me for 7 days</span>
            </label>
          </div>

          {error && <div className="login-error">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            disabled={!password || loading}
            className="login-button"
          >
            {loading ? (
              <>
                <LoadingSpinner size={16} />
                <span>Logging in...</span>
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Login;
