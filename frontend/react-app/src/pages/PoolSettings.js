import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatSwapFee, formatMaxPriceDeviation } from '../utils/contracts';
import { ethers } from 'ethers';
import '../pool-settings.css';

const PoolSettings = () => {
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

  // Pool parameter states
  const [swapFee, setSwapFee] = useState('');
  const [maxPriceDeviation, setMaxPriceDeviation] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [newAccessManager, setNewAccessManager] = useState('');

  // Form states
  const [newSwapFee, setNewSwapFee] = useState('');
  const [newMaxPriceDeviation, setNewMaxPriceDeviation] = useState('');
  const [newPausedState, setNewPausedState] = useState(false);

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

        // Load pool parameters
        await loadPoolSettings(contractsResult);
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to connect wallet or load contracts, please refresh the page and try again');
        setDataLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [navigate]);

  // Load pool parameters
  const loadPoolSettings = async (contractsData) => {
    setDataLoading(true);
    setError('');

    try {
      // Ensure we have valid contract instances
      const contractsToUse = contractsData || contracts;
      if (!contractsToUse || !contractsToUse.poolContract) {
        console.error('Contract instance not initialized:', contractsToUse);
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { poolContract } = contractsToUse;
      console.log('Successfully got pool contract instance:', poolContract.address);

      // Get all parameters in parallel
      const [swapFeeResult, maxPriceDeviationResult, pausedResult] = await Promise.all([
        poolContract.swapFee(),
        poolContract.maxPriceDeviation(),
        poolContract.paused()
      ]);

      // Update state
      setSwapFee(formatSwapFee(swapFeeResult));
      setMaxPriceDeviation(formatMaxPriceDeviation(maxPriceDeviationResult));
      setIsPaused(pausedResult);
      setNewPausedState(pausedResult);

      // Reset form
      setNewSwapFee('');
      setNewMaxPriceDeviation('');
      setNewAccessManager('');

    } catch (error) {
      console.error('Failed to load pool parameters:', error);
      setError('Failed to load pool parameters, please refresh the page and try again');
    } finally {
      setDataLoading(false);
    }
  };

  // Set swap fee
  const handleSetSwapFee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!newSwapFee || isNaN(parseFloat(newSwapFee))) {
        throw new Error('Please enter a valid swap fee rate');
      }

      // Convert percentage to basis points (1% = 100 basis points)
      const feeInBasisPoints = Math.round(parseFloat(newSwapFee) * 100);

      if (feeInBasisPoints < 0 || feeInBasisPoints > 100) {
        throw new Error('Swap fee rate must be between 0-1%');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setSwapFee(feeInBasisPoints);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`Swap fee rate has been successfully set to ${newSwapFee}%`);
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error('Failed to set swap fee rate:', error);
      setError(error.message || 'Failed to set swap fee rate, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Set maximum price deviation
  const handleSetMaxPriceDeviation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!newMaxPriceDeviation || isNaN(parseFloat(newMaxPriceDeviation))) {
        throw new Error('Please enter a valid maximum price deviation value');
      }

      // Convert percentage to permille (1% = 10 permille)
      const deviationInPermille = Math.round(parseFloat(newMaxPriceDeviation) * 10);

      if (deviationInPermille < 1 || deviationInPermille > 200) {
        throw new Error('Maximum price deviation must be between 0.1%-20%');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setMaxPriceDeviation(deviationInPermille);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`Maximum price deviation has been successfully set to ${newMaxPriceDeviation}%`);
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error('Failed to set maximum price deviation:', error);
      setError(error.message || 'Failed to set maximum price deviation, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Pause/resume pool operations
  const handleSetPaused = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!contracts || !contracts.poolContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setPaused(newPausedState);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`Pool state has been successfully ${newPausedState ? 'paused' : 'resumed'}`);
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error(`Failed to ${newPausedState ? 'pause' : 'resume'} pool operations:`, error);
      setError(error.message || `Failed to ${newPausedState ? 'pause' : 'resume'} pool operations, please try again`);
    } finally {
      setLoading(false);
    }
  };

  // Update access manager contract
  const handleUpdateAccessManager = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!ethers.utils.isAddress(newAccessManager)) {
        throw new Error('Please enter a valid contract address');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.updateAccessManager(newAccessManager);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess('Access manager contract has been successfully updated');
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error('Failed to update access manager contract:', error);
      setError(error.message || 'Failed to update access manager contract, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="pool-settings-container">
        <div className="pool-settings-header">
          <h1 className="pool-settings-title">Pool Settings</h1>
          <button
            className="pool-settings-refresh-btn"
            onClick={() => loadPoolSettings(contracts)}
            disabled={loading || dataLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="pool-settings-error">
            {error}
            <button
              className="pool-settings-refresh-btn"
              onClick={() => loadPoolSettings(contracts)}
            >
              Retry
            </button>
          </div>
        )}

        {success && (
          <div className="pool-settings-success">
            {success}
            {txHash && (
              <a
                href={`https://${networkName === 'homestead' ? '' : networkName + '.'}etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pool-settings-tx-link"
              >
                View Transaction
              </a>
            )}
          </div>
        )}

        {dataLoading ? (
          <div className="pool-settings-loading">
            <div className="pool-settings-spinner"></div>
            <p className="pool-settings-loading-text">Loading pool parameters...</p>
          </div>
        ) : (
          <div className="pool-settings-row">
            {/* Current Parameters */}
            <div className="pool-settings-card">
              <div className="pool-settings-card-header">
                <h5 className="pool-settings-card-title">Current Parameters</h5>
              </div>
              <div className="pool-settings-card-body">
                <div className="pool-settings-parameter">
                  <span className="pool-settings-parameter-label">Swap Fee:</span>
                  <span className="pool-settings-parameter-value">{swapFee}</span>
                </div>
                <div className="pool-settings-parameter">
                  <span className="pool-settings-parameter-label">Max Price Deviation:</span>
                  <span className="pool-settings-parameter-value">{maxPriceDeviation}</span>
                </div>
                <div className="pool-settings-parameter">
                  <span className="pool-settings-parameter-label">Pool Status:</span>
                  <span className={`pool-settings-status ${isPaused ? 'pool-settings-status-paused' : 'pool-settings-status-active'}`}>
                    {isPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Parameter Settings */}
            <div className="pool-settings-card">
              <div className="pool-settings-card-header">
                <h5 className="pool-settings-card-title">Parameter Settings</h5>
              </div>
              <div className="pool-settings-card-body">
                {/* Set Swap Fee */}
                <form onSubmit={handleSetSwapFee} className="pool-settings-form">
                  <h6 className="pool-settings-form-title">Set Swap Fee</h6>
                  <div className="pool-settings-input-group">
                    <input
                      type="number"
                      className="pool-settings-input"
                      placeholder="Enter new swap fee rate (0-1%)"
                      step="0.01"
                      min="0"
                      max="1"
                      value={newSwapFee}
                      onChange={(e) => setNewSwapFee(e.target.value)}
                      disabled={loading}
                    />
                    <span className="pool-settings-input-addon">%</span>
                  </div>
                  <button
                    type="submit"
                    className="pool-settings-button"
                    disabled={loading || !newSwapFee}
                  >
                    {loading ? 'Processing...' : 'Set Swap Fee'}
                  </button>
                </form>

                {/* Set Maximum Price Deviation */}
                <form onSubmit={handleSetMaxPriceDeviation} className="pool-settings-form">
                  <h6 className="pool-settings-form-title">Set Maximum Price Deviation</h6>
                  <div className="pool-settings-input-group">
                    <input
                      type="number"
                      className="pool-settings-input"
                      placeholder="Enter new maximum price deviation (0.1-20%)"
                      step="0.1"
                      min="0.1"
                      max="20"
                      value={newMaxPriceDeviation}
                      onChange={(e) => setNewMaxPriceDeviation(e.target.value)}
                      disabled={loading}
                    />
                    <span className="pool-settings-input-addon">%</span>
                  </div>
                  <button
                    type="submit"
                    className="pool-settings-button"
                    disabled={loading || !newMaxPriceDeviation}
                  >
                    {loading ? 'Processing...' : 'Set Maximum Price Deviation'}
                  </button>
                </form>

                {/* Pause/Resume Pool Operations */}
                <form onSubmit={handleSetPaused} className="pool-settings-form">
                  <h6 className="pool-settings-form-title">Pool Status Management</h6>
                  <div className="pool-settings-switch-container" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <label className="pool-settings-switch">
                      <input
                        type="checkbox"
                        checked={newPausedState}
                        onChange={(e) => setNewPausedState(e.target.checked)}
                        disabled={loading}
                      />
                      <span className="pool-settings-switch-slider"></span>
                    </label>
                    <span className="pool-settings-switch-label">
                      {newPausedState ? 'Pool is paused' : 'Pool is active'}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className={`pool-settings-button ${newPausedState ? 'pool-settings-button-danger' : 'pool-settings-button-success'}`}
                    disabled={loading || newPausedState === isPaused}
                  >
                    {loading ? 'Processing...' : newPausedState ? 'Pause Pool Operations' : 'Resume Pool Operations'}
                  </button>
                </form>

                {/* Update Access Manager Contract */}
                <form onSubmit={handleUpdateAccessManager} className="pool-settings-form">
                  <h6 className="pool-settings-form-title">Update Access Manager Contract (Advanced)</h6>
                  <input
                    type="text"
                    className="pool-settings-address-input"
                    placeholder="Enter new access manager contract address"
                    value={newAccessManager}
                    onChange={(e) => setNewAccessManager(e.target.value)}
                    disabled={loading}
                  />
                  <div className="pool-settings-warning">
                    Warning: This operation will change the access manager contract address, which may result in loss of admin privileges. Please make sure you know what you are doing!
                  </div>
                  <button
                    type="submit"
                    className="pool-settings-button pool-settings-button-warning"
                    disabled={loading || !newAccessManager}
                  >
                    {loading ? 'Processing...' : 'Update Access Manager Contract'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolSettings;
