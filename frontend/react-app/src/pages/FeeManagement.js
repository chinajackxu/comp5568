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

  // 手续费管理状态
  const [accumulatedFees, setAccumulatedFees] = useState({ fees0: '0', fees1: '0' });
  const [currentSwapFee, setCurrentSwapFee] = useState('0');
  const [newSwapFee, setNewSwapFee] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenSymbols, setTokenSymbols] = useState({ token0: 'Token0', token1: 'Token1' });

  // 初始化
  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // 初始化合约
        const contractsResult = await initializeContracts();
        const { address, accessContract, poolContract, btkContract, mtkContract } = contractsResult;

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

        // 获取代币符号
        const token0Symbol = await btkContract.symbol();
        const token1Symbol = await mtkContract.symbol();
        setTokenSymbols({ token0: token0Symbol, token1: token1Symbol });

        // 获取当前交易费率
        const swapFee = await poolContract.swapFee();
        setCurrentSwapFee(swapFee.toString());

        // 获取累积的手续费
        await loadAccumulatedFees(poolContract);

        setDataLoading(false);
      } catch (error) {
        console.error('初始化失败:', error);
        setError('连接钱包或加载合约失败，请刷新页面重试');
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
      console.error('获取累积手续费失败:', error);
      setError('获取累积手续费失败，请刷新页面重试');
    }
  };

  // 刷新累积的手续费
  const handleRefreshFees = async () => {
    if (!contracts || !contracts.poolContract) {
      setError('合约实例未初始化，请刷新页面重试');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await loadAccumulatedFees(contracts.poolContract);
      setSuccess('手续费数据已刷新');
    } catch (error) {
      console.error('刷新手续费失败:', error);
      setError('刷新手续费失败，请重试');
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
        throw new Error('请输入有效的接收地址');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { poolContract } = contracts;

      // 检查是否有手续费可提取
      const fees = await poolContract.getAccumulatedFees();
      if (fees.fees0.isZero() && fees.fees1.isZero()) {
        throw new Error('没有手续费可提取');
      }

      const tx = await poolContract.collectFees(recipientAddress);

      setTxHash(tx.hash);
      await tx.wait();

      // 更新累积的手续费
      await loadAccumulatedFees(poolContract);

      setSuccess(`手续费已成功提取到地址: ${recipientAddress}`);
      setRecipientAddress('');
    } catch (error) {
      console.error('提取手续费失败:', error);
      setError(error.message || '提取手续费失败，请重试');
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
        throw new Error('请输入有效的交易费用（0-100）');
      }

      if (!contracts || !contracts.poolContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { poolContract } = contracts;
      const tx = await poolContract.setSwapFee(feeValue);

      setTxHash(tx.hash);
      await tx.wait();

      setCurrentSwapFee(feeValue.toString());
      setSuccess(`交易费用已成功设置为: ${feeValue} (${feeValue / 100}%)`);
      setNewSwapFee('');
    } catch (error) {
      console.error('设置交易费用失败:', error);
      setError(error.message || '设置交易费用失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-header">
          <h1 className="admin-dashboard-title">手续费管理</h1>
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
                查看交易
              </a>
            )}
          </div>
        )}

        {dataLoading ? (
          <div className="admin-dashboard-loading">
            <div className="admin-dashboard-spinner"></div>
            <p className="admin-dashboard-loading-text">加载中...</p>
          </div>
        ) : (
          <div className="row">
            {/* 累积的手续费 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">累积的手续费</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="admin-dashboard-info-box mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">手续费余额</h6>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleRefreshFees}
                        disabled={loading}
                      >
                        刷新
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
                    <h6 className="admin-dashboard-form-title">提取手续费</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="输入接收地址"
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
                      {loading ? '处理中...' : '提取手续费'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* 交易费用设置 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">交易费用设置</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="admin-dashboard-info-box mb-3">
                    <h6>当前交易费用</h6>
                    <p className="mb-0">
                      <strong>费率:</strong> {currentSwapFee} 基点 ({parseFloat(currentSwapFee) / 100}%)
                    </p>
                    <p className="mb-0 text-muted small">
                      注: 1基点 = 0.01%
                    </p>
                  </div>

                  <form onSubmit={handleSetSwapFee}>
                    <h6 className="admin-dashboard-form-title">设置新的交易费用</h6>
                    <div className="input-group mb-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="输入新的交易费用（基点，0-100）"
                        value={newSwapFee}
                        onChange={(e) => setNewSwapFee(e.target.value)}
                        min="0"
                        max="100"
                        disabled={loading}
                      />
                      <span className="input-group-text">基点</span>
                    </div>
                    <p className="text-muted small mb-3">
                      输入值: {newSwapFee ? `${newSwapFee} 基点 = ${parseFloat(newSwapFee) / 100}%` : '请输入值'}
                    </p>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !newSwapFee}
                    >
                      {loading ? '处理中...' : '设置交易费用'}
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
