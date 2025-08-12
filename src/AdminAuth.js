import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminAuth({ isLoginState, onToggleForm, onGoogleLogin, onTraditionalLogin, onTraditionalSignup, onForgotPassword, isLoading }) {
  const navigate = useNavigate(); // Get the navigate function
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoginState) {
      await onTraditionalLogin({ email, password });
      // Redirect after a successful traditional login
      navigate('/admin');
    } else {
      await onTraditionalSignup({ name, email, password });
      // Redirect after a successful traditional signup
      navigate('/admin');
    }
  };

  const handleGoogleAuthSuccess = async (credentialResponse) => {
    // You'd need to handle Google login for admin and then redirect
    console.log(credentialResponse);
    navigate('/admin');
  };

  const handleGoogleAuthError = () => {
    console.log('Login Failed');
    alert('Google login failed.');
  };

  return (
    <main className="main-content auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{isLoginState ? 'Admin Login' : 'Admin Sign Up'}</h1>
        <p className="auth-subtitle">
          {isLoginState ? 'Sign in to your admin account' : 'Create a new admin account'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginState && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group password-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  // Eye-off icon (closed eye) when password is visible
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.94 3.19"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  // Eye icon (open eye) when password is hidden
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {isLoginState && (
            <div className="forgot-password">
              <Link to="#" onClick={() => onForgotPassword(email)}>Forgot Password?</Link>
            </div>
          )}

          <button type="submit" className="btn auth-btn" disabled={isLoading}>
            {isLoading ? (isLoginState ? 'Logging in...' : 'Signing Up...') : (isLoginState ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="divider">OR</div>
        
        {/* Google Login button */}
        <button onClick={onGoogleLogin} className="btn btn-google" disabled={isLoading}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/512px-Google_%22G%22_logo.svg.png" alt="Google logo" />
          {isLoginState ? 'Login with Google' : 'Sign up with Google'}
        </button>

        <div className="toggle-form-text">
          {isLoginState ? 'New to MyShop? ' : 'Already have an account? '}
          <span onClick={onToggleForm} className="toggle-link">
            {isLoginState ? 'Create an admin account' : 'Login as admin'}
          </span>
        </div>
      </div>
    </main>
  );
}