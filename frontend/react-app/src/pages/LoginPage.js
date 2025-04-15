import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeContracts, checkIsAdmin } from '../utils/contracts';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 检查是否已经登录
    const userAddress = localStorage.getItem('userAddress');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (userAddress) {
      // 如果已经登录，自动跳转
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
      // 初始化合约
      const { address, accessContract } = await initializeContracts();

      // 检查用户是否为管理员
      const isAdmin = await checkIsAdmin(accessContract, address);

      // 将用户信息存储在localStorage中
      localStorage.setItem('userAddress', address);
      localStorage.setItem('isAdmin', isAdmin);

      // 根据用户角色跳转到相应页面
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError(error.message || '登录失败，请重试');
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
        <h2>连接钱包</h2>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <p className="text-center mb-3">
          请使用MetaMask连接到Sepolia测试网络
        </p>

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? '连接中...' : '连接MetaMask'}
        </button>

        <div className="text-center mt-3">
          <small>
            连接钱包后，系统将自动检测您的权限并跳转到相应页面
          </small>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
