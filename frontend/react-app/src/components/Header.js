import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header = ({ address, isAdmin }) => {
  const navigate = useNavigate();

  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('userAddress');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <h1>OnlyDex</h1>
        </div>

        <nav className="header-nav">
          <ul>
            {isAdmin ? (
              <>
                <li><Link to="/admin">控制面板</Link></li>
                <li><Link to="/admin/tokens">代币管理</Link></li>
                <li><Link to="/admin/pool-settings">池参数设置</Link></li>
                <li><Link to="/admin/positions">NFT头寸管理</Link></li>
                <li><Link to="/admin/fees">手续费管理</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/user">控制面板</Link></li>
                <li><Link to="/user/liquidity">流动性</Link></li>
                <li><Link to="/user/swap">交换</Link></li>
              </>
            )}
          </ul>
        </nav>

        <div className="header-account">
          <div className="header-account-address">
            {formatAddress(address)}
          </div>
          <button className="btn" onClick={handleLogout}>
            退出
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
