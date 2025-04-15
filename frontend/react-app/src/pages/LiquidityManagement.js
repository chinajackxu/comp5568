import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts } from '../utils/contracts';
import { ethers } from 'ethers';
import '../user-dashboard.css';
import '../liquidity-management.css';

const LiquidityManagement = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('myLiquidity'); // 'myLiquidity' or 'addLiquidity'
  const [positions, setPositions] = useState([]);
  const [balances, setBalances] = useState({
    btk: '0',
    mtk: '0'
  });
  const [allowances, setAllowances] = useState({
    btk: '0',
    mtk: '0'
  });
  const [currentRate, setCurrentRate] = useState('0');
  const [btkAmount, setBtkAmount] = useState('');
  const [mtkAmount, setMtkAmount] = useState('');
  const [slippage, setSlippage] = useState('1.0');
  const [deadline, setDeadline] = useState('20');
  const [approving, setApproving] = useState(false);
  const [addingLiquidity, setAddingLiquidity] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removingLiquidity, setRemovingLiquidity] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // 初始化
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 初始化合约
        const contractsResult = await initializeContracts();
        const {
          address,
          poolContract,
          nftContract,
          btkContract,
          mtkContract
        } = contractsResult;
        setAddress(address);

        // 获取代币余额
        const btkBalance = await btkContract.balanceOf(address);
        const mtkBalance = await mtkContract.balanceOf(address);

        setBalances({
          btk: ethers.utils.formatUnits(btkBalance, 18),
          mtk: ethers.utils.formatUnits(mtkBalance, 18)
        });

        // 获取授权额度
        const btkAllowance = await btkContract.allowance(address, poolContract.address);
        const mtkAllowance = await mtkContract.allowance(address, poolContract.address);

        setAllowances({
          btk: ethers.utils.formatUnits(btkAllowance, 18),
          mtk: ethers.utils.formatUnits(mtkAllowance, 18)
        });

        // 获取当前汇率
        const rate = await poolContract.getRate();
        setCurrentRate(ethers.utils.formatUnits(rate, 18));

        // 获取用户的NFT头寈
        await loadUserPositions(nftContract, poolContract, address);

        setLoading(false);
      } catch (error) {
        console.error('初始化失败:', error);
        setError('连接钱包或加载合约失败，请刷新页面重试');
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // 处理BTK输入变化
  const handleBtkAmountChange = (value) => {
    setBtkAmount(value);
    if (value && !isNaN(value) && parseFloat(value) > 0) {
      // 根据当前汇率计算MTK数量
      const mtk = parseFloat(value) * parseFloat(currentRate);
      setMtkAmount(mtk.toFixed(6));
    } else {
      setMtkAmount('');
    }
  };

  // 处理MTK输入变化
  const handleMtkAmountChange = (value) => {
    setMtkAmount(value);
    if (value && !isNaN(value) && parseFloat(value) > 0 && parseFloat(currentRate) > 0) {
      // 根据当前汇率计算BTK数量
      const btk = parseFloat(value) / parseFloat(currentRate);
      setBtkAmount(btk.toFixed(6));
    } else {
      setBtkAmount('');
    }
  };

  // 设置最大BTK数量
  const handleSetMaxBtk = () => {
    const maxBtk = parseFloat(balances.btk);
    setBtkAmount(maxBtk.toString());
    handleBtkAmountChange(maxBtk.toString());
  };

  // 设置最大MTK数量
  const handleSetMaxMtk = () => {
    const maxMtk = parseFloat(balances.mtk);
    setMtkAmount(maxMtk.toString());
    handleMtkAmountChange(maxMtk.toString());
  };

  // 授权BTK
  const handleApproveBtk = async () => {
    if (!btkAmount || parseFloat(btkAmount) <= 0) {
      setError('Please enter a valid BTK amount');
      return;
    }

    setApproving(true);
    setError('');

    try {
      const { btkContract, poolContract } = await initializeContracts();

      // 计算授权金额（添加一些额外量，以防止精度问题）
      const amountToApprove = ethers.utils.parseEther((parseFloat(btkAmount) * 1.05).toString());

      // 发送授权交易
      const tx = await btkContract.approve(poolContract.address, amountToApprove);
      await tx.wait();

      // 更新授权额度
      const newAllowance = await btkContract.allowance(address, poolContract.address);
      setAllowances(prev => ({
        ...prev,
        btk: ethers.utils.formatUnits(newAllowance, 18)
      }));

      setSuccess('BTK approved successfully');
    } catch (error) {
      console.error('BTK approval failed:', error);

      // 处理特定类型的授权错误
      if (error.code === 4001) {
        // 用户取消授权
        setError('You cancelled the approval.');
      } else if (error.message && error.message.includes('insufficient funds')) {
        // 余额不足
        setError('Approval failed: Insufficient funds, please ensure you have enough ETH for gas.');
      } else {
        // 其他错误
        setError(error.message || 'BTK approval failed, please try again');
      }
    } finally {
      setApproving(false);
    }
  };

  // 授权MTK
  const handleApproveMtk = async () => {
    if (!mtkAmount || parseFloat(mtkAmount) <= 0) {
      setError('Please enter a valid MTK amount');
      return;
    }

    setApproving(true);
    setError('');

    try {
      const { mtkContract, poolContract } = await initializeContracts();

      // 计算授权金额（添加一些额外量，以防止精度问题）
      const amountToApprove = ethers.utils.parseEther((parseFloat(mtkAmount) * 1.05).toString());

      // 发送授权交易
      const tx = await mtkContract.approve(poolContract.address, amountToApprove);
      await tx.wait();

      // 更新授权额度
      const newAllowance = await mtkContract.allowance(address, poolContract.address);
      setAllowances(prev => ({
        ...prev,
        mtk: ethers.utils.formatUnits(newAllowance, 18)
      }));

      setSuccess('MTK approved successfully');
    } catch (error) {
      console.error('MTK approval failed:', error);

      // 处理特定类型的授权错误
      if (error.code === 4001) {
        // 用户取消授权
        setError('You cancelled the approval.');
      } else if (error.message && error.message.includes('insufficient funds')) {
        // 余额不足
        setError('Approval failed: Insufficient funds, please ensure you have enough ETH for gas.');
      } else {
        // 其他错误
        setError(error.message || 'MTK approval failed, please try again');
      }
    } finally {
      setApproving(false);
    }
  };

  // 转让流动性
  const handleTransferLiquidity = (tokenId) => {
    setSelectedTokenId(tokenId);
    setRecipientAddress('');
    setShowTransferModal(true);
  };

  // 执行转让流动性
  const executeTransferLiquidity = async () => {
    if (!selectedTokenId || !recipientAddress) {
      setError('Please enter a valid recipient address');
      return;
    }

    // 检查地址格式
    if (!ethers.utils.isAddress(recipientAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    setTransferring(true);
    setError('');
    setSuccess('');

    try {
      const { nftContract } = await initializeContracts();

      // 转让NFT
      const tx = await nftContract.transferFrom(address, recipientAddress, selectedTokenId);
      setTxHash(tx.hash);
      await tx.wait();

      // 重新加载头寈
      const { poolContract } = await initializeContracts();
      await loadUserPositions(nftContract, poolContract, address);

      setSuccess('Liquidity transferred successfully!');
      setShowTransferModal(false);
    } catch (error) {
      console.error('Failed to transfer liquidity:', error);

      // 处理特定类型的错误
      if (error.code === 4001) {
        // 用户取消交易
        setError('You cancelled the transaction.');
      } else {
        // 其他错误
        setError(error.message || 'Failed to transfer liquidity, please try again');
      }
    } finally {
      setTransferring(false);
    }
  };

  // 移除流动性
  const handleRemoveLiquidity = (tokenId) => {
    setSelectedTokenId(tokenId);
    setShowRemoveModal(true);
  };

  // 执行移除流动性
  const executeRemoveLiquidity = async () => {
    if (!selectedTokenId) {
      setError('Invalid position ID');
      return;
    }

    setRemovingLiquidity(true);
    setError('');
    setSuccess('');

    try {
      const { poolContract, nftContract } = await initializeContracts();

      // 计算滑点
      const slippagePercent = parseFloat(slippage) / 100;

      // 获取头寈信息
      const position = positions.find(p => p.tokenId === selectedTokenId);
      if (!position) {
        throw new Error('Position information not found');
      }

      // 计算最小接受量
      const minAmount0 = parseFloat(position.amount0) * (1 - slippagePercent);
      const minAmount1 = parseFloat(position.amount1) * (1 - slippagePercent);

      // 计算截止时间
      const deadlineMinutes = parseInt(deadline);
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;

      // 转换为Wei
      const minAmount0Wei = ethers.utils.parseEther(minAmount0.toFixed(18));
      const minAmount1Wei = ethers.utils.parseEther(minAmount1.toFixed(18));

      // 移除流动性
      const tx = await poolContract.removeLiquidity(
        selectedTokenId,
        minAmount0Wei,
        minAmount1Wei,
        deadlineTimestamp
      );

      setTxHash(tx.hash);
      await tx.wait();

      // 更新余额
      const { btkContract, mtkContract } = await initializeContracts();
      const newBtkBalance = await btkContract.balanceOf(address);
      const newMtkBalance = await mtkContract.balanceOf(address);

      setBalances({
        btk: ethers.utils.formatUnits(newBtkBalance, 18),
        mtk: ethers.utils.formatUnits(newMtkBalance, 18)
      });

      // 重新加载头寈
      await loadUserPositions(nftContract, poolContract, address);

      setSuccess('Liquidity removed successfully!');
      setShowRemoveModal(false);
    } catch (error) {
      console.error('Failed to remove liquidity:', error);

      // 处理特定类型的错误
      if (error.code === 4001) {
        // 用户取消交易
        setError('You cancelled the transaction.');
      } else if (error.message && error.message.includes('deadline')) {
        // 超过截止时间
        setError('Transaction failed: Deadline exceeded, please try again.');
      } else {
        // 其他错误
        setError(error.message || 'Failed to remove liquidity, please try again');
      }
    } finally {
      setRemovingLiquidity(false);
    }
  };

  // 添加流动性
  const handleAddLiquidity = async () => {
    if (!btkAmount || !mtkAmount || parseFloat(btkAmount) <= 0 || parseFloat(mtkAmount) <= 0) {
      setError('Please enter valid BTK and MTK amounts');
      return;
    }

    // 检查授权额度
    if (parseFloat(btkAmount) > parseFloat(allowances.btk)) {
      setError('Please approve BTK first');
      return;
    }

    if (parseFloat(mtkAmount) > parseFloat(allowances.mtk)) {
      setError('Please approve MTK first');
      return;
    }

    // 检查余额
    if (parseFloat(btkAmount) > parseFloat(balances.btk)) {
      setError('Insufficient BTK balance');
      return;
    }

    if (parseFloat(mtkAmount) > parseFloat(balances.mtk)) {
      setError('Insufficient MTK balance');
      return;
    }

    setAddingLiquidity(true);
    setError('');
    setSuccess('');

    try {
      const { poolContract, nftContract } = await initializeContracts();

      // 计算滑点
      const slippagePercent = parseFloat(slippage) / 100;
      const minBtkAmount = parseFloat(btkAmount) * (1 - slippagePercent);
      const minMtkAmount = parseFloat(mtkAmount) * (1 - slippagePercent);

      // 计算截止时间
      const deadlineMinutes = parseInt(deadline);
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;

      // 转换为Wei
      const btkAmountWei = ethers.utils.parseEther(btkAmount);
      const mtkAmountWei = ethers.utils.parseEther(mtkAmount);
      const minBtkAmountWei = ethers.utils.parseEther(minBtkAmount.toFixed(18));
      const minMtkAmountWei = ethers.utils.parseEther(minMtkAmount.toFixed(18));

      // 添加流动性
      const tx = await poolContract.addLiquidity(
        btkAmountWei,
        mtkAmountWei,
        minBtkAmountWei,
        minMtkAmountWei,
        deadlineTimestamp
      );

      setTxHash(tx.hash);
      await tx.wait();

      // 更新余额
      const { btkContract, mtkContract } = await initializeContracts();
      const newBtkBalance = await btkContract.balanceOf(address);
      const newMtkBalance = await mtkContract.balanceOf(address);

      setBalances({
        btk: ethers.utils.formatUnits(newBtkBalance, 18),
        mtk: ethers.utils.formatUnits(newMtkBalance, 18)
      });

      // 更新授权额度
      const newBtkAllowance = await btkContract.allowance(address, poolContract.address);
      const newMtkAllowance = await mtkContract.allowance(address, poolContract.address);

      setAllowances({
        btk: ethers.utils.formatUnits(newBtkAllowance, 18),
        mtk: ethers.utils.formatUnits(newMtkAllowance, 18)
      });

      // 重新加载头寈
      await loadUserPositions(nftContract, poolContract, address);

      // 清空输入
      setBtkAmount('');
      setMtkAmount('');

      setSuccess('Liquidity added successfully!');

      // 切换到我的流动性选项卡
      setActiveTab('myLiquidity');
    } catch (error) {
      console.error('Failed to add liquidity:', error);

      // 处理特定类型的错误
      if (error.code === 4001) {
        // 用户取消交易
        setError('You cancelled the transaction.');
      } else if (error.message && error.message.includes('Price deviation too high')) {
        // 价格偏离太大
        setError('Transaction failed: Price deviation too high, please adjust token ratio or increase slippage tolerance.');
      } else if (error.message && error.message.includes('insufficient funds')) {
        // 余额不足
        setError('Transaction failed: Insufficient funds, please ensure you have enough tokens and gas.');
      } else if (error.message && error.message.includes('deadline')) {
        // 超过截止时间
        setError('Transaction failed: Deadline exceeded, please try again.');
      } else {
        // 其他错误
        setError(error.message || 'Failed to add liquidity, please try again');
      }
    } finally {
      setAddingLiquidity(false);
    }
  };

  // 加载用户的NFT头寈
  const loadUserPositions = async (nftContract, poolContract, userAddress) => {
    try {
      // 获取用户拥有的NFT数量
      const balance = await nftContract.balanceOf(userAddress);
      const balanceNumber = balance.toNumber();

      if (balanceNumber === 0) {
        setPositions([]);
        return;
      }

      // 获取每个NFT的ID和详细信息
      const positionPromises = [];
      for (let i = 0; i < balanceNumber; i++) {
        const tokenIdPromise = nftContract.tokenOfOwnerByIndex(userAddress, i);
        positionPromises.push(tokenIdPromise);
      }

      const tokenIds = await Promise.all(positionPromises);

      // 获取每个头寈的详细信息
      const positionInfoPromises = tokenIds.map(tokenId =>
        poolContract.getPositionInfo(tokenId)
      );

      const positionInfos = await Promise.all(positionInfoPromises);

      // 格式化头寈信息
      const formattedPositions = tokenIds.map((tokenId, index) => {
        const info = positionInfos[index];
        return {
          tokenId: tokenId.toString(),
          token0: info.posToken0,
          token1: info.posToken1,
          amount0: ethers.utils.formatUnits(info.amount0, 18),
          amount1: ethers.utils.formatUnits(info.amount1, 18),
          createdAt: new Date(info.createdAt.toNumber() * 1000).toLocaleString()
        };
      });

      setPositions(formattedPositions);
    } catch (error) {
      console.error('Failed to load positions:', error);
      setError('Failed to load liquidity positions, please refresh the page and try again');
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={false} />
      <div className="user-dashboard-container">
        <div className="user-dashboard-header">
          <h1 className="user-dashboard-title">Liquidity Management</h1>
          <button
            className="user-dashboard-refresh-btn"
            onClick={() => window.location.reload()}
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

        {success && (
          <div className="user-dashboard-success">
            {success}
          </div>
        )}

        {loading ? (
          <div className="user-dashboard-loading">
            <div className="user-dashboard-spinner"></div>
            <p className="user-dashboard-loading-text">Loading...</p>
          </div>
        ) : (
          <div className="liquidity-management-container">
            {/* Tabs */}
            <div className="liquidity-tabs">
              <button
                className={`liquidity-tab ${activeTab === 'myLiquidity' ? 'active' : ''}`}
                onClick={() => setActiveTab('myLiquidity')}
              >
                My Liquidity
              </button>
              <button
                className={`liquidity-tab ${activeTab === 'addLiquidity' ? 'active' : ''}`}
                onClick={() => setActiveTab('addLiquidity')}
              >
                Add Liquidity
              </button>
            </div>

            {/* My Liquidity Tab */}
            {activeTab === 'myLiquidity' && (
              <div className="liquidity-list">
                {positions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">⚠</div>
                    <p className="empty-state-text">You haven't added any liquidity yet</p>
                    <button
                      className="empty-state-btn"
                      onClick={() => setActiveTab('addLiquidity')}
                    >
                      Add Liquidity
                    </button>
                  </div>
                ) : (
                  positions.map(position => (
                    <div key={position.tokenId} className="liquidity-item">
                      <div className="liquidity-item-header">
                        <div className="liquidity-item-title">BTK/MTK Liquidity Position</div>
                        <div className="liquidity-item-id">ID: {position.tokenId}</div>
                      </div>
                      <div className="liquidity-item-details">
                        <div className="liquidity-item-detail">
                          <span className="liquidity-item-label">BTK Amount</span>
                          <span className="liquidity-item-value">{parseFloat(position.amount0).toFixed(6)} BTK</span>
                        </div>
                        <div className="liquidity-item-detail">
                          <span className="liquidity-item-label">MTK Amount</span>
                          <span className="liquidity-item-value">{parseFloat(position.amount1).toFixed(6)} MTK</span>
                        </div>
                        <div className="liquidity-item-detail">
                          <span className="liquidity-item-label">Created At</span>
                          <span className="liquidity-item-value">{position.createdAt}</span>
                        </div>
                        <div className="liquidity-item-detail">
                          <span className="liquidity-item-label">Estimated Value</span>
                          <span className="liquidity-item-value">
                            {(parseFloat(position.amount0) + parseFloat(position.amount1) * parseFloat(currentRate)).toFixed(6)} BTK
                          </span>
                        </div>
                      </div>
                      <div className="liquidity-item-actions">
                        <button
                          className="liquidity-action-btn primary"
                          onClick={() => handleTransferLiquidity(position.tokenId)}
                        >
                          Transfer Liquidity
                        </button>
                        <button
                          className="liquidity-action-btn danger"
                          onClick={() => handleRemoveLiquidity(position.tokenId)}
                        >
                          Remove Liquidity
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Add Liquidity Tab */}
            {activeTab === 'addLiquidity' && (
              <div className="add-liquidity-form">
                <h3>Add Liquidity</h3>
                <p>Current Rate: 1 BTK = {currentRate} MTK</p>

                <div className="form-row">
                  <div className="form-col">
                    <div className="form-group">
                      <label className="form-label">BTK Amount</label>
                      <div className="form-input-group">
                        <input
                          type="number"
                          className="form-input"
                          placeholder="0.0"
                          value={btkAmount}
                          onChange={(e) => handleBtkAmountChange(e.target.value)}
                        />
                        <div className="form-input-group-append">BTK</div>
                      </div>
                      <div className="form-help-text">
                        Balance: {parseFloat(balances.btk).toFixed(6)} BTK
                        <button
                          className="max-btn"
                          onClick={handleSetMaxBtk}
                          type="button"
                        >
                          Max
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-col">
                    <div className="form-group">
                      <label className="form-label">MTK Amount</label>
                      <div className="form-input-group">
                        <input
                          type="number"
                          className="form-input"
                          placeholder="0.0"
                          value={mtkAmount}
                          onChange={(e) => handleMtkAmountChange(e.target.value)}
                        />
                        <div className="form-input-group-append">MTK</div>
                      </div>
                      <div className="form-help-text">
                        Balance: {parseFloat(balances.mtk).toFixed(6)} MTK
                        <button
                          className="max-btn"
                          onClick={handleSetMaxMtk}
                          type="button"
                        >
                          Max
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-col">
                    <div className="form-group">
                      <label className="form-label">Slippage Tolerance</label>
                      <div className="form-input-group">
                        <input
                          type="number"
                          className="form-input"
                          placeholder="1.0"
                          value={slippage}
                          onChange={(e) => setSlippage(e.target.value)}
                          min="0.1"
                          step="0.1"
                        />
                        <div className="form-input-group-append">%</div>
                      </div>
                      <div className="form-help-text">Slippage tolerance determines the maximum price movement you are willing to accept</div>
                    </div>
                  </div>

                  <div className="form-col">
                    <div className="form-group">
                      <label className="form-label">Deadline</label>
                      <div className="form-input-group">
                        <input
                          type="number"
                          className="form-input"
                          placeholder="20"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          min="1"
                        />
                        <div className="form-input-group-append">minutes</div>
                      </div>
                      <div className="form-help-text">Transaction will expire after this time</div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  {parseFloat(btkAmount) > parseFloat(allowances.btk) ? (
                    <button
                      className="liquidity-action-btn primary"
                      onClick={handleApproveBtk}
                      disabled={approving || !btkAmount || parseFloat(btkAmount) <= 0}
                    >
                      {approving ? 'Approving...' : 'Approve BTK'}
                    </button>
                  ) : null}

                  {parseFloat(mtkAmount) > parseFloat(allowances.mtk) ? (
                    <button
                      className="liquidity-action-btn primary"
                      onClick={handleApproveMtk}
                      disabled={approving || !mtkAmount || parseFloat(mtkAmount) <= 0}
                    >
                      {approving ? 'Approving...' : 'Approve MTK'}
                    </button>
                  ) : null}

                  <button
                    className="liquidity-action-btn primary"
                    onClick={handleAddLiquidity}
                    disabled={addingLiquidity ||
                      !btkAmount ||
                      !mtkAmount ||
                      parseFloat(btkAmount) <= 0 ||
                      parseFloat(mtkAmount) <= 0 ||
                      parseFloat(btkAmount) > parseFloat(allowances.btk) ||
                      parseFloat(mtkAmount) > parseFloat(allowances.mtk)}
                  >
                    {addingLiquidity ? 'Adding...' : 'Add Liquidity'}
                  </button>
                </div>

                {txHash && (
                  <div className="tx-info">
                    <p>Transaction Hash:
                      <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 转让流动性模态框 */}
      {showTransferModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>转让流动性</h3>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>您将转让ID为 {selectedTokenId} 的流动性头寈。</p>
              <div className="form-group">
                <label className="form-label">接收者地址</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => setShowTransferModal(false)}
              >
                取消
              </button>
              <button
                className="modal-btn primary"
                onClick={executeTransferLiquidity}
                disabled={transferring || !recipientAddress}
              >
                {transferring ? '转让中...' : '确认转让'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 移除流动性模态框 */}
      {showRemoveModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>移除流动性</h3>
              <button className="modal-close" onClick={() => setShowRemoveModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>您将移除ID为 {selectedTokenId} 的流动性头寈。</p>
              <p>移除后，您将收到相应的BTK和MTK代币。</p>

              <div className="form-group">
                <label className="form-label">滑点容忍度</label>
                <div className="form-input-group">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="1.0"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    min="0.1"
                    step="0.1"
                  />
                  <div className="form-input-group-append">%</div>
                </div>
                <div className="form-help-text">滑点容忍度决定了您愿意接受的最大价格变动</div>
              </div>

              <div className="form-group">
                <label className="form-label">截止时间</label>
                <div className="form-input-group">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="20"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min="1"
                  />
                  <div className="form-input-group-append">分钟</div>
                </div>
                <div className="form-help-text">交易将在该时间后过期</div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn secondary"
                onClick={() => setShowRemoveModal(false)}
              >
                取消
              </button>
              <button
                className="modal-btn danger"
                onClick={executeRemoveLiquidity}
                disabled={removingLiquidity}
              >
                {removingLiquidity ? '移除中...' : '确认移除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityManagement;
