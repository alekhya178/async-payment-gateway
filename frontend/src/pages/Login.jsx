import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // For Deliverable 1, we simulate login and store the test credentials
    localStorage.setItem('merchant_email', email);
    localStorage.setItem('api_key', 'key_test_abc123');
    localStorage.setItem('api_secret', 'secret_test_xyz789');
    navigate('/dashboard');
  };

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Merchant Login</h1>
      <form data-test-id="login-form" onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <input
            data-test-id="email-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <input
            data-test-id="password-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px' }}
          />
        </div>
        <button 
            data-test-id="login-button" 
            style={{ width: '100%', padding: '10px', backgroundColor: 'blue', color: 'white', border: 'none' }}
        >
            Login
        </button>
      </form>
    </div>
  );
};

export default Login;