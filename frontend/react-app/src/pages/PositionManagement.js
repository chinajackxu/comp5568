import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatTokenAmount } from '../utils/contracts';
import { ethers } from 'ethers';
import '../admin-dashboard.css';
import '../modal.css';
import '../input-group.css';

const PositionManagement = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txHash, setTxHash] = useState('');
  const [networkName, setNetworkName] = useState('');

  // Position management state
  const [tokenId, setTokenId] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [positionInfo, setPositionInfo] = useState(null);
  const [baseURI, setBaseURI] = useState('');
  const [poolAddress, setPoolAddress] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [userTokens, setUserTokens] = useState([]);

  // Initialization
  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // Initialize contracts
        const contractsResult = await initializeContracts();
        const { address, accessContract } = contractsResult;

        // Check if admin
        const isAdmin = await accessContract.isAdmin(address);

        if (!isAdmin) {
          console.log('Not an admin account, redirecting to admin panel');
          navigate('/admin');
          return;
        }

        setAddress(address);
        setIsAdmin(isAdmin);
        setContracts(contractsResult);

        // Get network name
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        setNetworkName(network.name);

        // Set default pool address
        setPoolAddress(contractsResult.poolContract.address);

        setDataLoading(false);
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to connect wallet or load contracts, please refresh the page and try again');
        setDataLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [navigate]);

  // Query NFT owner
  const handleQueryOwner = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setOwnerAddress('');
    setPositionInfo(null);

    try {
      if (!tokenId || isNaN(parseInt(tokenId))) {
        throw new Error('Please enter a valid Token ID');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { positionContract } = contracts;

      try {
        const owner = await positionContract.ownerOf(tokenId);
        setOwnerAddress(owner);
        setSuccess(`Owner of Token ID ${tokenId} is: ${owner}`);

        // Also get position information
        await handleGetPositionInfo();
      } catch (error) {
        if (error.message.includes('owner query for nonexistent token')) {
          throw new Error(`Token ID ${tokenId} does not exist`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to query NFT owner:', error);
      setError(error.message || 'Failed to query NFT owner, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Get position information
  const handleGetPositionInfo = async (e) => {
    if (e) e.preventDefault();

    if (!e) {
      // 如果是从handleQueryOwner调用的，不需要设置loading状态
    } else {
      setLoading(true);
      setError('');
      setSuccess('');
      setPositionInfo(null);
    }

    try {
      if (!tokenId || isNaN(parseInt(tokenId))) {
        throw new Error('Please enter a valid Token ID');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { positionContract } = contracts;

      try {
        const info = await positionContract.getPositionInfo(tokenId);
        const posInfo = {
          token0: info.token0,
          token1: info.token1,
          amount0: formatTokenAmount(info.amount0),
          amount1: formatTokenAmount(info.amount1),
          createdAt: new Date(info.createdAt.toNumber() * 1000).toLocaleString()
        };

        setPositionInfo(posInfo);

        if (e) {
          setSuccess(`Retrieved position information for Token ID ${tokenId}`);
        }
      } catch (error) {
        if (error.message.includes('Position does not exist')) {
          throw new Error(`Token ID ${tokenId} does not exist`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to get position information:', error);
      setError(error.message || 'Failed to get position information, please try again');
    } finally {
      if (e) {
        setLoading(false);
      }
    }
  };

  // Set base URI
  const handleSetBaseURI = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!baseURI) {
        throw new Error('Please enter a base URI');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { positionContract } = contracts;
      const tx = await positionContract.setBaseURI(baseURI);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`Base URI has been successfully set to: ${baseURI}`);
      setBaseURI('');
    } catch (error) {
      console.error('Failed to set base URI:', error);
      setError(error.message || 'Failed to set base URI, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Authorize or deauthorize pool contract
  const handleSetPoolAuthorization = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!ethers.utils.isAddress(poolAddress)) {
        throw new Error('Please enter a valid pool contract address');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { positionContract } = contracts;
      const tx = await positionContract.setPoolAuthorization(poolAddress, isAuthorized);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`Pool contract ${poolAddress} has been successfully ${isAuthorized ? 'authorized' : 'deauthorized'}`);
    } catch (error) {
      console.error('Failed to set pool authorization:', error);
      setError(error.message || 'Failed to set pool authorization, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Query all tokenIds owned by a user
  const handleGetUserTokens = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setUserTokens([]);

    try {
      if (!ethers.utils.isAddress(userAddress)) {
        throw new Error('Please enter a valid user address');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { positionContract } = contracts;

      try {
        const tokens = await positionContract.tokensOfOwner(userAddress);
        const tokenIds = tokens.map(token => token.toString());
        setUserTokens(tokenIds);

        if (tokenIds.length === 0) {
          setSuccess(`User ${userAddress} does not own any NFT positions`);
        } else {
          setSuccess(`User ${userAddress} owns ${tokenIds.length} NFT positions`);
        }
      } catch (error) {
        console.error('Failed to query user positions:', error);
        throw new Error('Failed to query user positions, please try again');
      }
    } catch (error) {
      console.error('Failed to query user positions:', error);
      setError(error.message || 'Failed to query user positions, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-header">
          <h1 className="admin-dashboard-title">NFT Position Management</h1>
        </div>

        {error && (
          <div className="admin-dashboard-error">
            {error}
          </div>
        )}

        {success && (
          <div className="admin-dashboard-success">
            {success}
            {txHash && (
              <a
                href={`https://${networkName === 'homestead' ? '' : networkName + '.'}etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-dashboard-tx-link"
              >
                View Transaction
              </a>
            )}
          </div>
        )}

        {dataLoading ? (
          <div className="admin-dashboard-loading">
            <div className="admin-dashboard-spinner"></div>
            <p className="admin-dashboard-loading-text">Loading...</p>
          </div>
        ) : (
          <div className="row">
            {/* Query NFT Owner and Position Information */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">Query NFT Information</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <form onSubmit={handleQueryOwner} className="mb-4">
                    <div className="input-group mb-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Enter Token ID"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="d-flex">
                      <button
                        type="submit"
                        className="btn btn-primary me-2"
                        disabled={loading || !tokenId}
                      >
                        {loading ? 'Querying...' : 'Query Owner'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGetPositionInfo}
                        disabled={loading || !tokenId}
                      >
                        {loading ? 'Querying...' : 'Query Position Info'}
                      </button>
                    </div>
                  </form>

                  {ownerAddress && (
                    <div className="admin-dashboard-info-box mb-3">
                      <h6>Owner Information</h6>
                      <p className="mb-0">
                        <strong>Token ID:</strong> {tokenId}
                      </p>
                      <p className="mb-0">
                        <strong>Owner Address:</strong> {ownerAddress}
                      </p>
                    </div>
                  )}

                  {positionInfo && (
                    <div className="admin-dashboard-info-box">
                      <h6>Position Information</h6>
                      <p className="mb-0">
                        <strong>Token0 Address:</strong> {positionInfo.token0}
                      </p>
                      <p className="mb-0">
                        <strong>Token1 Address:</strong> {positionInfo.token1}
                      </p>
                      <p className="mb-0">
                        <strong>Token0 Amount:</strong> {positionInfo.amount0}
                      </p>
                      <p className="mb-0">
                        <strong>Token1 Amount:</strong> {positionInfo.amount1}
                      </p>
                      <p className="mb-0">
                        <strong>Created At:</strong> {positionInfo.createdAt}
                      </p>
                    </div>
                  )}

                  {/* Query all tokenIds owned by a user */}
                  <form onSubmit={handleGetUserTokens} className="mt-4">
                    <h6 className="admin-dashboard-form-title">Query User's NFTs</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter User Address"
                        value={userAddress}
                        onChange={(e) => setUserAddress(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !userAddress}
                    >
                      {loading ? 'Querying...' : 'Query User NFTs'}
                    </button>
                  </form>

                  {userTokens.length > 0 && (
                    <div className="admin-dashboard-info-box mt-3">
                      <h6>User's NFT Positions</h6>
                      <div className="user-tokens-list">
                        {userTokens.map((tokenId, index) => (
                          <div key={index} className="user-token-item">
                            <span className="badge bg-primary me-2">Token ID: {tokenId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Set Base URI and Pool Authorization */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">NFT Settings</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  {/* Set Base URI */}
                  <form onSubmit={handleSetBaseURI} className="mb-4">
                    <h6 className="admin-dashboard-form-title">Set Base URI</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Base URI (e.g.: https://example.com/nft/)"
                        value={baseURI}
                        onChange={(e) => setBaseURI(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !baseURI}
                    >
                      {loading ? 'Processing...' : 'Set Base URI'}
                    </button>
                  </form>

                  {/* Authorize or Deauthorize Pool Contract */}
                  <form onSubmit={handleSetPoolAuthorization}>
                    <h6 className="admin-dashboard-form-title">Pool Contract Authorization</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Pool Contract Address"
                        value={poolAddress}
                        onChange={(e) => setPoolAddress(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="authorizedSwitch"
                        checked={isAuthorized}
                        onChange={(e) => setIsAuthorized(e.target.checked)}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="authorizedSwitch">
                        {isAuthorized ? 'Authorize' : 'Deauthorize'}
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !poolAddress}
                    >
                      {loading ? 'Processing...' : isAuthorized ? 'Authorize Pool Contract' : 'Deauthorize Pool Contract'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PositionManagement;
