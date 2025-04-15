import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatTokenAmount, formatRate } from '../utils/contracts';
import { ethers } from 'ethers';
import '../user-dashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [networkName, setNetworkName] = useState('');

  // User data state
  const [balances, setBalances] = useState({
    btk: '0',
    mtk: '0'
  });
  const [currentRate, setCurrentRate] = useState('0');
  const [positionCount, setPositionCount] = useState(0);
  const [poolBalances, setPoolBalances] = useState({
    btk: '0',
    mtk: '0'
  });

  // Initialization
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize contracts
        const contractsResult = await initializeContracts();
        const { address, poolContract, btkContract, mtkContract, positionContract } = contractsResult;

        setAddress(address);
        setContracts(contractsResult);

        // Get network name
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        setNetworkName(network.name);

        // Load user data
        await loadUserData(address, btkContract, mtkContract, positionContract, poolContract);

        setLoading(false);
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to connect wallet or load contracts, please refresh the page and try again');
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Load user data
  const loadUserData = async (userAddress, btkContract, mtkContract, positionContract, poolContract) => {
    try {
      // Get token balances
      try {
        const btkBalance = await btkContract.balanceOf(userAddress);
        const mtkBalance = await mtkContract.balanceOf(userAddress);

        setBalances({
          btk: formatTokenAmount(btkBalance),
          mtk: formatTokenAmount(mtkBalance)
        });
      } catch (error) {
        console.error('Failed to get token balances:', error);
      }

      // Get current exchange rate
      try {
        const rate = await poolContract.getRate();
        setCurrentRate(formatRate(rate));
      } catch (error) {
        console.error('Failed to get exchange rate:', error);
      }

      // Get user NFT position count
      try {
        const positionBalance = await positionContract.balanceOf(userAddress);
        setPositionCount(positionBalance.toNumber());
      } catch (error) {
        console.error('Failed to get NFT position count:', error);
        // If error, set to 0
        setPositionCount(0);
      }

      // Get token balances in the pool
      try {
        const poolBtk = await btkContract.balanceOf(poolContract.address);
        const poolMtk = await mtkContract.balanceOf(poolContract.address);

        setPoolBalances({
          btk: formatTokenAmount(poolBtk),
          mtk: formatTokenAmount(poolMtk)
        });
      } catch (error) {
        console.error('Failed to get pool balances:', error);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load user data, please refresh the page and try again');
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    if (!contracts) {
      setError('Contract instance not initialized, please refresh the page and try again');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { address, poolContract, btkContract, mtkContract, positionContract } = contracts;
      await loadUserData(address, btkContract, mtkContract, positionContract, poolContract);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={false} />
      <div className="user-dashboard-container">
        <div className="user-dashboard-header">
          <h1 className="user-dashboard-title">User Dashboard</h1>
          <button
            className="user-dashboard-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="user-dashboard-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="user-dashboard-loading">
            <div className="user-dashboard-spinner"></div>
            <p className="user-dashboard-loading-text">Loading...</p>
          </div>
        ) : (
          <div className="row">
            {/* User Assets Card */}
            <div className="col-md-6 mb-4">
              <div className="user-dashboard-card">
                <div className="user-dashboard-card-header">
                  <h5 className="user-dashboard-card-title">My Assets</h5>
                </div>
                <div className="user-dashboard-card-body">
                  <div className="user-dashboard-info-box">
                    <div className="user-dashboard-balance-item">
                      <span className="user-dashboard-token-name">BTK:</span>
                      <span className="user-dashboard-token-balance">{balances.btk}</span>
                    </div>
                    <div className="user-dashboard-balance-item">
                      <span className="user-dashboard-token-name">MTK:</span>
                      <span className="user-dashboard-token-balance">{balances.mtk}</span>
                    </div>
                    <div className="user-dashboard-balance-item">
                      <span className="user-dashboard-token-name">NFT Positions:</span>
                      <span className="user-dashboard-token-balance">{positionCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Information Card */}
            <div className="col-md-6 mb-4">
              <div className="user-dashboard-card">
                <div className="user-dashboard-card-header">
                  <h5 className="user-dashboard-card-title">Market Information</h5>
                </div>
                <div className="user-dashboard-card-body">
                  <div className="user-dashboard-info-box">
                    <div className="user-dashboard-info-item">
                      <span className="user-dashboard-info-label">Current Rate:</span>
                      <span className="user-dashboard-info-value">1 BTK = {currentRate} MTK</span>
                    </div>
                    <div className="user-dashboard-info-item">
                      <span className="user-dashboard-info-label">Pool BTK:</span>
                      <span className="user-dashboard-info-value">{poolBalances.btk}</span>
                    </div>
                    <div className="user-dashboard-info-item">
                      <span className="user-dashboard-info-label">Pool MTK:</span>
                      <span className="user-dashboard-info-value">{poolBalances.mtk}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="col-md-12 mb-4">
              <div className="user-dashboard-card">
                <div className="user-dashboard-card-header">
                  <h5 className="user-dashboard-card-title">Quick Actions</h5>
                </div>
                <div className="user-dashboard-card-body">
                  <div className="user-dashboard-actions">
                    <button
                      className="user-dashboard-action-btn user-dashboard-action-btn-primary"
                      onClick={() => navigate('/user/swap')}
                    >
                      Swap Tokens
                    </button>
                    <button
                      className="user-dashboard-action-btn user-dashboard-action-btn-success"
                      onClick={() => navigate('/user/liquidity')}
                    >
                      Manage Liquidity
                    </button>
                    <button
                      className="user-dashboard-action-btn user-dashboard-action-btn-info"
                      onClick={() => navigate('/user/positions')}
                    >
                      View Positions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
