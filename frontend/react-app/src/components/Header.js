import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header = ({ address, isAdmin }) => {
  const navigate = useNavigate();

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
                <li><Link to="/admin">Dashboard</Link></li>
                <li><Link to="/admin/tokens">Token Management</Link></li>
                <li><Link to="/admin/pool-settings">Pool Settings</Link></li>
                <li><Link to="/admin/positions">NFT Position Management</Link></li>
                <li><Link to="/admin/fees">Fee Management</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/user">Dashboard</Link></li>
                <li><Link to="/user/liquidity">Liquidity</Link></li>
                <li><Link to="/user/swap">Swap</Link></li>
                <li><Link to="/user/history">Transaction History</Link></li>
                <li><Link to="/user/price">Price Chart</Link></li>
              </>
            )}
          </ul>
        </nav>

        <div className="header-account">
          <div className="header-account-address">
            {formatAddress(address)}
          </div>
          <button className="btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
