import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatSwapFee, formatMaxPriceDeviation } from '../utils/contracts';
import { ethers } from 'ethers';
import '../admin-dashboard.css';
import '../modal.css';
import '../input-group.css';

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

  // 池参数状态
  const [swapFee, setSwapFee] = useState('');
  const [maxPriceDeviation, setMaxPriceDeviation] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [newAccessManager, setNewAccessManager] = useState('');

  // 表单状态
  const [newSwapFee, setNewSwapFee] = useState('');
  const [newMaxPriceDeviation, setNewMaxPriceDeviation] = useState('');
  const [newPausedState, setNewPausedState] = useState(false);

  // 初始化
  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // 初始化合约
        const contractsResult = await initializeContracts();
        const { address, accessContract } = contractsResult;

        // 检查是否为管理员
        const isAdmin = await accessContract.isAdmin(address);

        if (!isAdmin) {
          console.log('非管理员账户，重定向到管理面板');
          navigate('/admin');
          return;
        }

        setAddress(address);
        setIsAdmin(isAdmin);
        setContracts(contractsResult);

        // 获取网络名称
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        setNetworkName(network.name);

        // 加载池参数
        await loadPoolSettings(contractsResult);
      } catch (error) {
        console.error('初始化失败:', error);
        setError('连接钱包或加载合约失败，请刷新页面重试');
        setDataLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [navigate]);

  // 加载池参数
  const loadPoolSettings = async (contractsData) => {
    setDataLoading(true);
    setError('');

    try {
      // 确保我们有有效的合约实例
      const contractsToUse = contractsData || contracts;
      if (!contractsToUse || !contractsToUse.poolContract) {
        console.error('合约实例未初始化:', contractsToUse);
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { poolContract } = contractsToUse;
      console.log('成功获取池合约实例:', poolContract.address);

      // 并行获取所有参数
      const [swapFeeResult, maxPriceDeviationResult, pausedResult] = await Promise.all([
        poolContract.swapFee(),
        poolContract.maxPriceDeviation(),
        poolContract.paused()
      ]);

      // 更新状态
      setSwapFee(formatSwapFee(swapFeeResult));
      setMaxPriceDeviation(formatMaxPriceDeviation(maxPriceDeviationResult));
      setIsPaused(pausedResult);
      setNewPausedState(pausedResult);

      // 重置表单
      setNewSwapFee('');
      setNewMaxPriceDeviation('');
      setNewAccessManager('');

    } catch (error) {
      console.error('加载池参数失败:', error);
      setError('加载池参数失败，请刷新页面重试');
    } finally {
      setDataLoading(false);
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
      if (!newSwapFee || isNaN(parseFloat(newSwapFee))) {
        throw new Error('请输入有效的交易费率');
      }

      // 将百分比转换为基点 (1% = 100基点)
      const feeInBasisPoints = Math.round(parseFloat(newSwapFee) * 100);

      if (feeInBasisPoints < 0 || feeInBasisPoints > 100) {
        throw new Error('交易费率必须在0-1%之间');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setSwapFee(feeInBasisPoints);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`交易费率已成功设置为 ${newSwapFee}%`);
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error('设置交易费率失败:', error);
      setError(error.message || '设置交易费率失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 设置最大价格偏离
  const handleSetMaxPriceDeviation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!newMaxPriceDeviation || isNaN(parseFloat(newMaxPriceDeviation))) {
        throw new Error('请输入有效的最大价格偏离值');
      }

      // 将百分比转换为千分比 (1% = 10千分比)
      const deviationInPermille = Math.round(parseFloat(newMaxPriceDeviation) * 10);

      if (deviationInPermille < 1 || deviationInPermille > 200) {
        throw new Error('最大价格偏离必须在0.1%-20%之间');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setMaxPriceDeviation(deviationInPermille);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`最大价格偏离已成功设置为 ${newMaxPriceDeviation}%`);
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error('设置最大价格偏离失败:', error);
      setError(error.message || '设置最大价格偏离失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 暂停/恢复池操作
  const handleSetPaused = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!contracts || !contracts.poolContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setPaused(newPausedState);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`池状态已成功${newPausedState ? '暂停' : '恢复'}`);
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error(`${newPausedState ? '暂停' : '恢复'}池操作失败:`, error);
      setError(error.message || `${newPausedState ? '暂停' : '恢复'}池操作失败，请重试`);
    } finally {
      setLoading(false);
    }
  };

  // 更新权限管理合约
  const handleUpdateAccessManager = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!ethers.utils.isAddress(newAccessManager)) {
        throw new Error('请输入有效的合约地址');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.updateAccessManager(newAccessManager);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess('权限管理合约已成功更新');
      await loadPoolSettings(contracts);
    } catch (error) {
      console.error('更新权限管理合约失败:', error);
      setError(error.message || '更新权限管理合约失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-header">
          <h1 className="admin-dashboard-title">池参数设置</h1>
          <button
            className="admin-dashboard-refresh-btn"
            onClick={() => loadPoolSettings(contracts)}
            disabled={loading || dataLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            刷新数据
          </button>
        </div>

        {error && (
          <div className="admin-dashboard-error">
            {error}
            <button
              className="admin-dashboard-error-retry"
              onClick={() => loadPoolSettings(contracts)}
            >
              重试
            </button>
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
                查看交易
              </a>
            )}
          </div>
        )}

        {dataLoading ? (
          <div className="admin-dashboard-loading">
            <div className="admin-dashboard-spinner"></div>
            <p className="admin-dashboard-loading-text">加载池参数...</p>
          </div>
        ) : (
          <div className="row">
            {/* 当前参数 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">当前参数</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="admin-dashboard-stat">
                    <p>交易费率: <span className="admin-dashboard-stat-value">{swapFee}</span></p>
                    <p>最大价格偏离: <span className="admin-dashboard-stat-value">{maxPriceDeviation}</span></p>
                    <p>池状态: <span className={`admin-dashboard-status ${isPaused ? 'admin-dashboard-status-paused' : 'admin-dashboard-status-active'}`}>
                      {isPaused ? '已暂停' : '活跃'}
                    </span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* 参数设置 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">参数设置</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  {/* 设置交易费用 */}
                  <form onSubmit={handleSetSwapFee} className="mb-4">
                    <h6 className="admin-dashboard-form-title">设置交易费率</h6>
                    <div className="input-group mb-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="输入新的交易费率 (0-1%)"
                        step="0.01"
                        min="0"
                        max="1"
                        value={newSwapFee}
                        onChange={(e) => setNewSwapFee(e.target.value)}
                        disabled={loading}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !newSwapFee}
                    >
                      {loading ? '处理中...' : '设置交易费率'}
                    </button>
                  </form>

                  {/* 设置最大价格偏离 */}
                  <form onSubmit={handleSetMaxPriceDeviation} className="mb-4">
                    <h6 className="admin-dashboard-form-title">设置最大价格偏离</h6>
                    <div className="input-group mb-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="输入新的最大价格偏离 (0.1-20%)"
                        step="0.1"
                        min="0.1"
                        max="20"
                        value={newMaxPriceDeviation}
                        onChange={(e) => setNewMaxPriceDeviation(e.target.value)}
                        disabled={loading}
                      />
                      <div className="input-group-append">
                        <span className="input-group-text">%</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !newMaxPriceDeviation}
                    >
                      {loading ? '处理中...' : '设置最大价格偏离'}
                    </button>
                  </form>

                  {/* 暂停/恢复池操作 */}
                  <form onSubmit={handleSetPaused} className="mb-4">
                    <h6 className="admin-dashboard-form-title">池状态管理</h6>
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="pausedSwitch"
                        checked={newPausedState}
                        onChange={(e) => setNewPausedState(e.target.checked)}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="pausedSwitch">
                        {newPausedState ? '池已暂停' : '池处于活跃状态'}
                      </label>
                    </div>
                    <button
                      type="submit"
                      className={`btn ${newPausedState ? 'btn-danger' : 'btn-success'}`}
                      disabled={loading || newPausedState === isPaused}
                    >
                      {loading ? '处理中...' : newPausedState ? '暂停池操作' : '恢复池操作'}
                    </button>
                  </form>

                  {/* 更新权限管理合约 */}
                  <form onSubmit={handleUpdateAccessManager}>
                    <h6 className="admin-dashboard-form-title">更新权限管理合约 (高级功能)</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="输入新的权限管理合约地址"
                        value={newAccessManager}
                        onChange={(e) => setNewAccessManager(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="alert alert-warning" role="alert">
                      <small>警告: 此操作将更改权限管理合约地址，可能导致管理权限丢失。请确保您知道自己在做什么！</small>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-warning"
                      disabled={loading || !newAccessManager}
                    >
                      {loading ? '处理中...' : '更新权限管理合约'}
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

export default PoolSettings;
