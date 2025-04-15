import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const UserPage = () => {
  const [address, setAddress] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 从localStorage获取用户信息
    const userAddress = localStorage.getItem('userAddress');
    
    // 如果用户未登录，重定向到登录页面
    if (!userAddress) {
      navigate('/login');
      return;
    }
    
    setAddress(userAddress);
  }, [navigate]);

  return (
    <div>
      <Header address={address} isAdmin={false} />
      <div className="container">
        <div className="card">
          <h2>用户控制面板</h2>
          <p>欢迎，用户！</p>
          <p>此页面将包含用户功能，如：</p>
          <ul>
            <li>添加流动性</li>
            <li>交换代币</li>
            <li>查看头寸</li>
            <li>提取收益</li>
          </ul>
          <p>这些功能将在后续实现。</p>
        </div>
      </div>
    </div>
  );
};

export default UserPage;
