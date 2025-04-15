import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const AdminPage = () => {
  const [address, setAddress] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 从localStorage获取用户信息
    const userAddress = localStorage.getItem('userAddress');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    // 如果用户不是管理员，重定向到登录页面
    if (!userAddress || !isAdmin) {
      navigate('/login');
      return;
    }
    
    setAddress(userAddress);
  }, [navigate]);

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="container">
        <div className="card">
          <h2>管理员控制面板</h2>
          <p>欢迎，管理员！</p>
          <p>此页面将包含管理员功能，如：</p>
          <ul>
            <li>管理用户权限</li>
            <li>铸造代币</li>
            <li>设置交易参数</li>
            <li>查看系统状态</li>
          </ul>
          <p>这些功能将在后续实现。</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
