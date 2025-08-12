// AccountAuth.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AccountAuth({ onGoogleLogin, onTraditionalLogin, onTraditionalSignup, onForgotPassword, isLoading, isLoginState, onToggleForm }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const password = e.target.password.value;

    if (isLoginState) {
      onTraditionalLogin({ email, password });
    } else {
      onTraditionalSignup({ name, email, password });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <main className="main-content auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{isLoginState ? 'Login' : 'Create an Account'}</h1>
        <p className="auth-subtitle">
          {isLoginState
            ? "Welcome back! Please login to your account."
            : "Join us today to get access to exclusive offers."}
        </p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLoginState && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input 
                type="text" 
                id="name" 
                placeholder="Enter your full name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group password-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="password" 
                placeholder="Enter your password" 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="toggle-password-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    // Eye-off icon (closed eye) when password is visible
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.94 3.19"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </>
                  ) : (
                    // Eye icon (open eye) when password is hidden
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {isLoginState && (
            <div className="forgot-password">
              <Link to="#" onClick={() => onForgotPassword && onForgotPassword(email)}>Forgot Password?</Link>
            </div>
          )}
          <button type="submit" className="btn auth-btn">
            {isLoginState ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>
        
        <button
          onClick={onGoogleLogin}
          className="btn btn-google"
          disabled={isLoading}
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/512px-Google_%22G%22_logo.svg.png" alt="Google logo" />
          {isLoginState ? 'Sign in with Google' : 'Sign up with Google'}
        </button>

        <p className="toggle-form-text">
          {isLoginState ? "Don't have an account? " : "Already have an account? "}
          <span onClick={onToggleForm} className="toggle-link">
            {isLoginState ? "Sign up" : "Login"}
          </span>
        </p>
      </div>
    </main>
  );
}
