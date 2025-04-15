import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../header.css';

const Header = ({ address, isAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if the current path matches the link path
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Format address display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Logout
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
                <li><Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Dashboard</Link></li>
                <li><Link to="/admin/tokens" className={isActive('/admin/tokens') ? 'active' : ''}>Token Management</Link></li>
                <li><Link to="/admin/pool-settings" className={isActive('/admin/pool-settings') ? 'active' : ''}>Pool Settings</Link></li>
                <li><Link to="/admin/positions" className={isActive('/admin/positions') ? 'active' : ''}>NFT Position Management</Link></li>
                <li><Link to="/admin/fees" className={isActive('/admin/fees') ? 'active' : ''}>Fee Management</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/user" className={isActive('/user') ? 'active' : ''}>Dashboard</Link></li>
                <li><Link to="/user/liquidity" className={isActive('/user/liquidity') ? 'active' : ''}>Liquidity</Link></li>
                <li><Link to="/user/swap" className={isActive('/user/swap') ? 'active' : ''}>Swap</Link></li>
                <li><Link to="/user/history" className={isActive('/user/history') ? 'active' : ''}>Transaction History</Link></li>
                <li><Link to="/user/price" className={isActive('/user/price') ? 'active' : ''}>Price Chart</Link></li>
              </>
            )}
          </ul>
        </nav>

        <div className="header-account">
          <div className="header-account-address">
            {formatAddress(address)}
          </div>
          <button className="header-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
