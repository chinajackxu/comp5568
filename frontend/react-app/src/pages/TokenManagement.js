import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import Header from '../components/Header';
import { initializeContracts, formatTokenAmount } from '../utils/contracts';
import '../dashboard.css';
import '../modal.css';
import '../input-group.css';
import '../form.css';

const TokenManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [address, setAddress] = useState('');
  const [contracts, setContracts] = useState(null);
  const [tokenData, setTokenData] = useState({
    btkBalance: '0',
    mtkBalance: '0',
    btkSymbol: 'BTK',
    mtkSymbol: 'MTK',
    btkDecimals: 18,
    mtkDecimals: 18
  });

  // 铸造代币表单状态
  const [mintToken, setMintToken] = useState('btk'); // 'btk' 或 'mtk'
  const [mintAmount, setMintAmount] = useState('');
  const [mintTo, setMintTo] = useState('');

  // 转账代币表单状态
  const [transferToken, setTransferToken] = useState('btk'); // 'btk' 或 'mtk'
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');

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

  // 当地址变化时加载代币数据
  useEffect(() => {
    if (address) {
      loadTokenData();
    }
  }, [address]);

  const loadTokenData = async () => {
    if (!address) return;

    setDataLoading(true);
    setError('');

    try {
      // 初始化合约
      const contractsData = await initializeContracts();
      const { btkContract, mtkContract } = contractsData;

      // 保存合约实例供后续使用
      setContracts(contractsData);

      // 并行获取所有数据，提高性能
      const [
        btkBalance,
        mtkBalance,
        btkSymbol,
        mtkSymbol,
        btkDecimals,
        mtkDecimals
      ] = await Promise.all([
        btkContract.balanceOf(address),
        mtkContract.balanceOf(address),
        btkContract.symbol(),
        mtkContract.symbol(),
        btkContract.decimals(),
        mtkContract.decimals()
      ]);

      // 更新代币数据
      setTokenData({
        btkBalance: formatTokenAmount(btkBalance, btkDecimals),
        mtkBalance: formatTokenAmount(mtkBalance, mtkDecimals),
        btkSymbol,
        mtkSymbol,
        btkDecimals,
        mtkDecimals
      });

    } catch (error) {
      console.error('Failed to load token data:', error);
      setError('Failed to load token data, please refresh the page and try again');
    } finally {
      setDataLoading(false);
    }
  };

  // 处理铸造代币
  const handleMint = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!contracts) {
        throw new Error('Contracts not initialized, please refresh the page and try again');
      }

      // 验证输入
      if (!mintAmount || parseFloat(mintAmount) <= 0) {
        throw new Error('Please enter a valid mint amount');
      }

      if (!ethers.utils.isAddress(mintTo)) {
        throw new Error('Please enter a valid recipient address');
      }

      // 选择合约
      const contract = mintToken === 'btk' ? contracts.btkContract : contracts.mtkContract;
      const tokenSymbol = mintToken === 'btk' ? tokenData.btkSymbol : tokenData.mtkSymbol;
      const decimals = mintToken === 'btk' ? tokenData.btkDecimals : tokenData.mtkDecimals;

      // 转换为Wei
      const amountWei = ethers.utils.parseUnits(mintAmount, decimals);

      // 铸造代币
      const tx = await contract.mint(mintTo, amountWei);
      await tx.wait();

      // 显示成功消息
      setSuccess(`Successfully minted ${mintAmount} ${tokenSymbol} to address ${mintTo}`);

      // 重置表单
      setMintAmount('');
      setMintTo('');

      // 刷新代币数据
      await loadTokenData();

    } catch (error) {
      console.error('Failed to mint tokens:', error);
      setError(error.message || 'Failed to mint tokens, please try again');
    } finally {
      setLoading(false);
    }
  };

  // 处理转账代币
  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!contracts) {
        throw new Error('Contracts not initialized, please refresh the page and try again');
      }

      // 验证输入
      if (!transferAmount || parseFloat(transferAmount) <= 0) {
        throw new Error('Please enter a valid transfer amount');
      }

      if (!ethers.utils.isAddress(transferTo)) {
        throw new Error('Please enter a valid recipient address');
      }

      // 选择合约
      const contract = transferToken === 'btk' ? contracts.btkContract : contracts.mtkContract;
      const tokenSymbol = transferToken === 'btk' ? tokenData.btkSymbol : tokenData.mtkSymbol;
      const decimals = transferToken === 'btk' ? tokenData.btkDecimals : tokenData.mtkDecimals;

      // 转换为Wei
      const amountWei = ethers.utils.parseUnits(transferAmount, decimals);

      // 转账代币
      const tx = await contract.transfer(transferTo, amountWei);
      await tx.wait();

      // 显示成功消息
      setSuccess(`Successfully transferred ${transferAmount} ${tokenSymbol} to address ${transferTo}`);

      // 重置表单
      setTransferAmount('');
      setTransferTo('');

      // 刷新代币数据
      await loadTokenData();

    } catch (error) {
      console.error('Failed to transfer tokens:', error);
      setError(error.message || 'Failed to transfer tokens, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="container">
        <div className="d-flex justify-content-between align-items-center mt-3 mb-3">
          <h1>Token Management</h1>
          <button
            className="dashboard-refresh-btn"
            onClick={loadTokenData}
            disabled={loading || dataLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-clockwise" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="dashboard-error">
            {error}
            <button
              className="dashboard-refresh-btn ml-3"
              onClick={loadTokenData}
            >
              Retry
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {dataLoading ? (
          <div className="dashboard-loading">
            <div className="dashboard-loading-spinner"></div>
            <p className="mt-3">Loading token data...</p>
          </div>
        ) : (
          <div className="row">
            {/* Token Balances */}
            <div className="col-md-12 mb-4">
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h5>Token Balances</h5>
                </div>
                <div className="dashboard-card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="dashboard-stat">
                        <h6>{tokenData.btkSymbol} Balance</h6>
                        <p><span className="dashboard-stat-value">{tokenData.btkBalance}</span> {tokenData.btkSymbol}</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="dashboard-stat">
                        <h6>{tokenData.mtkSymbol} Balance</h6>
                        <p><span className="dashboard-stat-value">{tokenData.mtkBalance}</span> {tokenData.mtkSymbol}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mint Tokens */}
            <div className="col-md-6 mb-4">
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h5>Mint Tokens</h5>
                </div>
                <div className="dashboard-card-body">
                  <form onSubmit={handleMint}>
                    <div className="mb-3">
                      <label className="form-label">Select Token</label>
                      <div className="d-flex">
                        <div className="form-check me-3">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="mintTokenType"
                            id="mintBTK"
                            value="btk"
                            checked={mintToken === 'btk'}
                            onChange={() => setMintToken('btk')}
                            disabled={loading}
                          />
                          <label className="form-check-label" htmlFor="mintBTK">
                            {tokenData.btkSymbol}
                          </label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="mintTokenType"
                            id="mintMTK"
                            value="mtk"
                            checked={mintToken === 'mtk'}
                            onChange={() => setMintToken('mtk')}
                            disabled={loading}
                          />
                          <label className="form-check-label" htmlFor="mintMTK">
                            {tokenData.mtkSymbol}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="mintAmount" className="form-label">Mint Amount</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          id="mintAmount"
                          value={mintAmount}
                          onChange={(e) => setMintAmount(e.target.value)}
                          placeholder="Enter amount"
                          disabled={loading}
                          step="0.000001"
                          min="0"
                          required
                        />
                        <span className="input-group-text">
                          {mintToken === 'btk' ? tokenData.btkSymbol : tokenData.mtkSymbol}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="mintTo" className="form-label">Recipient Address</label>
                      <input
                        type="text"
                        className="form-control"
                        id="mintTo"
                        value={mintTo}
                        onChange={(e) => setMintTo(e.target.value)}
                        placeholder="0x..."
                        disabled={loading}
                        required
                      />
                      <small className="form-text text-muted">
                        Enter the Ethereum address to receive the minted tokens
                      </small>
                    </div>

                    <div className="d-grid gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Processing...' : 'Mint Tokens'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Transfer Tokens */}
            <div className="col-md-6 mb-4">
              <div className="dashboard-card">
                <div className="dashboard-card-header">
                  <h5>Transfer Tokens</h5>
                </div>
                <div className="dashboard-card-body">
                  <form onSubmit={handleTransfer}>
                    <div className="mb-3">
                      <label className="form-label">Select Token</label>
                      <div className="d-flex">
                        <div className="form-check me-3">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="transferTokenType"
                            id="transferBTK"
                            value="btk"
                            checked={transferToken === 'btk'}
                            onChange={() => setTransferToken('btk')}
                            disabled={loading}
                          />
                          <label className="form-check-label" htmlFor="transferBTK">
                            {tokenData.btkSymbol}
                          </label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="transferTokenType"
                            id="transferMTK"
                            value="mtk"
                            checked={transferToken === 'mtk'}
                            onChange={() => setTransferToken('mtk')}
                            disabled={loading}
                          />
                          <label className="form-check-label" htmlFor="transferMTK">
                            {tokenData.mtkSymbol}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="transferAmount" className="form-label">Transfer Amount</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          id="transferAmount"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          placeholder="Enter amount"
                          disabled={loading}
                          step="0.000001"
                          min="0"
                          required
                        />
                        <span className="input-group-text">
                          {transferToken === 'btk' ? tokenData.btkSymbol : tokenData.mtkSymbol}
                        </span>
                      </div>
                      <small className="form-text text-muted">
                        Current balance: {transferToken === 'btk' ? tokenData.btkBalance : tokenData.mtkBalance} {transferToken === 'btk' ? tokenData.btkSymbol : tokenData.mtkSymbol}
                      </small>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="transferTo" className="form-label">Recipient Address</label>
                      <input
                        type="text"
                        className="form-control"
                        id="transferTo"
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                        placeholder="0x..."
                        disabled={loading}
                        required
                      />
                      <small className="form-text text-muted">
                        Enter the Ethereum address to receive the transferred tokens
                      </small>
                    </div>

                    <div className="d-grid gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Processing...' : 'Transfer Tokens'}
                      </button>
                    </div>
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

export default TokenManagement;
