import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatTokenAmount } from '../utils/contracts';
import { ethers } from 'ethers';
import '../admin-dashboard.css';
import '../modal.css';
import '../input-group.css';

const FeeManagement = () => {
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

  // Fee management state
  const [accumulatedFees, setAccumulatedFees] = useState({ fees0: '0', fees1: '0' });
  const [currentSwapFee, setCurrentSwapFee] = useState('0');
  const [newSwapFee, setNewSwapFee] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenSymbols, setTokenSymbols] = useState({ token0: 'Token0', token1: 'Token1' });

  // Initialization
  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // Initialize contracts
        const contractsResult = await initializeContracts();
        const { address, accessContract, poolContract, btkContract, mtkContract } = contractsResult;

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

        // Get token symbols
        const token0Symbol = await btkContract.symbol();
        const token1Symbol = await mtkContract.symbol();
        setTokenSymbols({ token0: token0Symbol, token1: token1Symbol });

        // Get current swap fee rate
        const swapFee = await poolContract.swapFee();
        setCurrentSwapFee(swapFee.toString());

        // Get accumulated fees
        await loadAccumulatedFees(poolContract);

        setDataLoading(false);
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to connect wallet or load contracts, please refresh the page and try again');
        setDataLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [navigate]);

  // 加载累积的手续费
  const loadAccumulatedFees = async (poolContract) => {
    try {
      const fees = await poolContract.getAccumulatedFees();
      setAccumulatedFees({
        fees0: formatTokenAmount(fees.fees0),
        fees1: formatTokenAmount(fees.fees1)
      });
    } catch (error) {
      console.error('Failed to get accumulated fees:', error);
      setError('Failed to get accumulated fees, please refresh the page and try again');
    }
  };

  // 刷新累积的手续费
  const handleRefreshFees = async () => {
    if (!contracts || !contracts.poolContract) {
      setError('Contract instance not initialized, please refresh the page and try again');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await loadAccumulatedFees(contracts.poolContract);
      setSuccess('Fee data has been refreshed');
    } catch (error) {
      console.error('Failed to refresh fees:', error);
      setError('Failed to refresh fees, please try again');
    } finally {
      setLoading(false);
    }
  };

  // 提取累积的手续费
  const handleCollectFees = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!ethers.utils.isAddress(recipientAddress)) {
        throw new Error('Please enter a valid recipient address');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { poolContract } = contracts;

      // 检查是否有手续费可提取
      const fees = await poolContract.getAccumulatedFees();
      if (fees.fees0.isZero() && fees.fees1.isZero()) {
        throw new Error('No fees available to collect');
      }

      const tx = await poolContract.collectFees(recipientAddress);

      setTxHash(tx.hash);
      await tx.wait();

      // 更新累积的手续费
      await loadAccumulatedFees(poolContract);

      setSuccess(`Fees have been successfully collected to address: ${recipientAddress}`);
      setRecipientAddress('');
    } catch (error) {
      console.error('Failed to collect fees:', error);
      setError(error.message || 'Failed to collect fees, please try again');
    } finally {
      setLoading(false);
    }
  };

  // 设置交易费用
  const handleSetSwapFee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      const feeValue = parseInt(newSwapFee);

      if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
        throw new Error('Please enter a valid swap fee (0-100)');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('Contract instance not initialized, please refresh the page and try again');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setSwapFee(feeValue);

      setTxHash(tx.hash);
      await tx.wait();

      setCurrentSwapFee(feeValue.toString());
      setSuccess(`Swap fee has been successfully set to: ${feeValue} (${feeValue / 100}%)`);
      setNewSwapFee('');
    } catch (error) {
      console.error('Failed to set swap fee:', error);
      setError(error.message || 'Failed to set swap fee, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-header">
          <h1 className="admin-dashboard-title">Fee Management</h1>
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
            {/* Accumulated Fees */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">Accumulated Fees</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="admin-dashboard-info-box mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">Fee Balance</h6>
                      <button
                        className="admin-dashboard-refresh-btn"
                        onClick={handleRefreshFees}
                        disabled={loading}
                      >
                        Refresh
                      </button>
                    </div>
                    <p className="mb-0">
                      <strong>{tokenSymbols.token0}:</strong> {accumulatedFees.fees0}
                    </p>
                    <p className="mb-0">
                      <strong>{tokenSymbols.token1}:</strong> {accumulatedFees.fees1}
                    </p>
                  </div>

                  <form onSubmit={handleCollectFees}>
                    <h6 className="admin-dashboard-form-title">Collect Fees</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter recipient address"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !recipientAddress || (accumulatedFees.fees0 === '0' && accumulatedFees.fees1 === '0')}
                    >
                      {loading ? 'Processing...' : 'Collect Fees'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Swap Fee Settings */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">Swap Fee Settings</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="admin-dashboard-info-box mb-3">
                    <h6>Current Swap Fee</h6>
                    <p className="mb-0">
                      <strong>Rate:</strong> {currentSwapFee} basis points ({parseFloat(currentSwapFee) / 100}%)
                    </p>
                    <p className="mb-0 text-muted small">
                      Note: 1 basis point = 0.01%
                    </p>
                  </div>

                  <form onSubmit={handleSetSwapFee}>
                    <h6 className="admin-dashboard-form-title">Set New Swap Fee</h6>
                    <div className="input-group mb-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Enter new swap fee (basis points, 0-100)"
                        value={newSwapFee}
                        onChange={(e) => setNewSwapFee(e.target.value)}
                        min="0"
                        max="100"
                        disabled={loading}
                      />
                      <span className="input-group-text">basis points</span>
                    </div>
                    <p className="text-muted small mb-3">
                      Input value: {newSwapFee ? `${newSwapFee} basis points = ${parseFloat(newSwapFee) / 100}%` : 'Please enter a value'}
                    </p>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !newSwapFee}
                    >
                      {loading ? 'Processing...' : 'Set Swap Fee'}
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

export default FeeManagement;
