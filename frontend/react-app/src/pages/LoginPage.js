import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeContracts, checkIsAdmin } from '../utils/contracts';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const userAddress = localStorage.getItem('userAddress');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (userAddress) {
      // If already logged in, automatically redirect
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    }
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Initialize contracts
      const { address, accessContract } = await initializeContracts();

      // Check if user is admin
      const isAdmin = await checkIsAdmin(accessContract, address);

      // Store user information in localStorage
      localStorage.setItem('userAddress', address);
      localStorage.setItem('isAdmin', isAdmin);

      // Redirect to appropriate page based on user role
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Login failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-logo">
        <h1>OnlyDex</h1>
      </div>
      <div className="login-form">
        <h2>Connect Wallet</h2>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <p className="text-center mb-3">
          Please connect to the Sepolia test network using MetaMask
        </p>

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect MetaMask'}
        </button>

        <div className="text-center mt-3">
          <small>
            After connecting your wallet, the system will automatically detect your permissions and redirect you to the appropriate page
          </small>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
