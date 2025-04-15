import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatTokenAmount } from '../utils/contracts';
import { ethers } from 'ethers';
import '../position-management.css';

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

        // 不再预设池合约地址
        setPoolAddress('');

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
      <div className="position-management-container">
        <div className="position-management-header">
          <h1 className="position-management-title">NFT Position Management</h1>
        </div>

        {error && (
          <div className="position-management-error">
            {error}
          </div>
        )}

        {success && (
          <div className="position-management-success">
            {success}
            {txHash && (
              <a
                href={`https://${networkName === 'homestead' ? '' : networkName + '.'}etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="position-management-tx-link"
              >
                View Transaction
              </a>
            )}
          </div>
        )}

        {dataLoading ? (
          <div className="position-management-loading">
            <div className="position-management-spinner"></div>
            <p className="position-management-loading-text">Loading...</p>
          </div>
        ) : (
          <div className="position-management-row">
            {[
              /* Query NFT Owner and Position Information */
              <div className="position-management-card" key="query-card">
                <div className="position-management-card-header">
                  <h5 className="position-management-card-title">Query NFT Information</h5>
                </div>
                <div className="position-management-card-body">
                  <form onSubmit={handleQueryOwner} className="position-management-form">
                    <h6 className="position-management-form-title">Query Token Information</h6>
                    <div className="position-management-input-group">
                      <input
                        type="number"
                        className="position-management-input"
                        placeholder="Enter Token ID"
                        value={tokenId}
                        onChange={(e) => setTokenId(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="position-management-button-container">
                      <button
                        type="button"
                        className="position-management-button"
                        onClick={handleGetPositionInfo}
                        disabled={loading || !tokenId}
                      >
                        {loading ? 'Querying...' : 'Query Position Info'}
                      </button>
                    </div>
                  </form>

                  {ownerAddress && (
                    <div className="position-management-info-box">
                      <h6>Owner Information</h6>
                      <p>
                        <strong>Token ID:</strong> {tokenId}
                      </p>
                      <p>
                        <strong>Owner Address:</strong> {ownerAddress}
                      </p>
                    </div>
                  )}

                  {positionInfo && (
                    <div className="position-management-info-box">
                      <h6>Position Information</h6>
                      <p>
                        <strong>Token0 Address:</strong> {positionInfo.token0}
                      </p>
                      <p>
                        <strong>Token1 Address:</strong> {positionInfo.token1}
                      </p>
                      <p>
                        <strong>Token0 Amount:</strong> {positionInfo.amount0}
                      </p>
                      <p>
                        <strong>Token1 Amount:</strong> {positionInfo.amount1}
                      </p>
                      <p>
                        <strong>Created At:</strong> {positionInfo.createdAt}
                      </p>
                    </div>
                  )}

                  {/* Query all tokenIds owned by a user */}
                  <form onSubmit={handleGetUserTokens} className="position-management-form">
                    <h6 className="position-management-form-title">Query User's NFTs</h6>
                    <div className="position-management-address-input">
                      <input
                        type="text"
                        className="position-management-input"
                        placeholder="Enter User Address"
                        value={userAddress}
                        onChange={(e) => setUserAddress(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="position-management-button"
                      disabled={loading || !userAddress}
                    >
                      {loading ? 'Querying...' : 'Query User NFTs'}
                    </button>
                  </form>

                  {userTokens.length > 0 && (
                    <div className="position-management-info-box">
                      <h6>User's NFT Positions</h6>
                      <div className="position-management-tokens-list">
                        {userTokens.map((tokenId, index) => (
                          <div key={index} className="position-management-token-item">
                            Token ID: {tokenId}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>,

              /* Set Base URI and Pool Authorization */
              <div className="position-management-card" key="settings-card">
                <div className="position-management-card-header">
                  <h5 className="position-management-card-title">NFT Settings</h5>
                </div>
                <div className="position-management-card-body">
                {/* Set Base URI */}
                <form onSubmit={handleSetBaseURI} className="position-management-form">
                  <h6 className="position-management-form-title">Set Base URI</h6>
                  <div className="position-management-address-input">
                    <input
                      type="text"
                      placeholder="Enter Base URI (e.g.: https://example.com/nft/)"
                      value={baseURI}
                      onChange={(e) => setBaseURI(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="submit"
                    className="position-management-button"
                    disabled={loading || !baseURI}
                  >
                    {loading ? 'Processing...' : 'Set Base URI'}
                  </button>
                </form>

                {/* Authorize or Deauthorize Pool Contract */}
                <form onSubmit={handleSetPoolAuthorization} className="position-management-form">
                  <h6 className="position-management-form-title">Pool Contract Authorization</h6>
                  <div className="position-management-address-input">
                    <input
                      type="text"
                      placeholder="Enter Pool Contract Address"
                      value={poolAddress}
                      onChange={(e) => setPoolAddress(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="position-management-switch-container">
                    <label className="position-management-switch">
                      <input
                        type="checkbox"
                        checked={isAuthorized}
                        onChange={(e) => setIsAuthorized(e.target.checked)}
                        disabled={loading}
                      />
                      <span className="position-management-switch-slider"></span>
                    </label>
                    <span className="position-management-switch-label">
                      {isAuthorized ? 'Authorize' : 'Deauthorize'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="position-management-button"
                    disabled={loading || !poolAddress}
                  >
                    {loading ? 'Processing...' : isAuthorized ? 'Authorize Pool Contract' : 'Deauthorize Pool Contract'}
                  </button>
                </form>
              </div>
            </div>
            ]}
          </div>
        )}
      </div>
    </div>
  );
};

export default PositionManagement;
