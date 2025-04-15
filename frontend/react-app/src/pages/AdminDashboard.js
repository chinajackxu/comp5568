import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import AddLiquidityModal from '../components/AddLiquidityModal';
import { initializeContracts, formatTokenAmount, formatRate, formatSwapFee, formatMaxPriceDeviation } from '../utils/contracts';
import { debugRateCalculation } from '../utils/debug';
import { ethers } from 'ethers';
import '../admin-dashboard.css';
import '../modal.css';
import '../input-group.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');
  const [showAddLiquidityModal, setShowAddLiquidityModal] = useState(false);
  const [contracts, setContracts] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    balances: { balance0: '0', balance1: '0' },
    fees: { fees0: '0', fees1: '0' },
    rate: '0',
    totalSupply: '0',
    amplificationParameter: '0',
    swapFee: '0',
    maxPriceDeviation: '0',
    paused: false,
    token0Symbol: 'BTK',
    token1Symbol: 'MTK'
  });

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

    // 加载仪表盘数据
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    setDataLoading(true);
    setError('');

    try {
      // 初始化合约
      const contractsData = await initializeContracts();
      const { poolContract, positionContract, btkContract, mtkContract } = contractsData;

      // 保存合约实例供后续使用
      setContracts(contractsData);

      // 并行获取所有数据，提高性能
      const [
        balancesResult,
        feesResult,
        rateResult,
        totalSupplyResult,
        swapFeeResult,
        maxPriceDeviationResult,
        pausedResult,
        token0SymbolResult,
        token1SymbolResult
      ] = await Promise.all([
        poolContract.getBalances(),
        poolContract.getAccumulatedFees(),
        poolContract.getRate(),
        positionContract.totalSupply(),
        poolContract.swapFee(),
        poolContract.maxPriceDeviation(),
        poolContract.paused(),
        btkContract.symbol(),
        mtkContract.symbol()
      ]);

      // 解析结果
      const [balance0, balance1] = balancesResult;
      const [fees0, fees1] = feesResult;

      // 打印调试日志
      console.log('===== 汇率调试日志 =====');
      console.log('原始汇率值 (raw rate):', rateResult.toString());
      console.log('池中的总流动性:');
      console.log('balance0 (BTK):', balance0.toString());
      console.log('balance1 (MTK):', balance1.toString());

      // 手动计算汇率
      const expectedRate = ethers.BigNumber.from(10).pow(18); // 如果池子平衡，应该接近 1e18
      console.log('预期汇率值 (如果池子平衡):', expectedRate.toString());

      // 手动计算扣除手续费后的汇率
      console.log('交易费率:', swapFeeResult.toString());
      const feeDeductedRate = expectedRate.mul(10000 - swapFeeResult).div(10000);
      console.log('扣除手续费后的预期汇率:', feeDeductedRate.toString());

      // 格式化后的汇率
      const formattedRate = formatRate(rateResult);
      console.log('前端格式化后的汇率:', formattedRate);

      // 调用调试函数进行更详细的分析
      console.log('\n===== 调用调试函数进行更详细的分析 =====');
      try {
        await debugRateCalculation(poolContract);
      } catch (error) {
        console.error('调试函数执行失败:', error);
      }
      console.log('===== 调试日志结束 =====');

      // 更新仪表盘数据
      setDashboardData({
        balances: {
          balance0: formatTokenAmount(balance0),
          balance1: formatTokenAmount(balance1)
        },
        fees: {
          fees0: formatTokenAmount(fees0),
          fees1: formatTokenAmount(fees1)
        },
        rate: formatRate(rateResult),
        totalSupply: totalSupplyResult.toString(),
        swapFee: formatSwapFee(swapFeeResult),
        maxPriceDeviation: formatMaxPriceDeviation(maxPriceDeviationResult),
        paused: pausedResult,
        token0Symbol: token0SymbolResult,
        token1Symbol: token1SymbolResult
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data, please refresh the page and try again');
    } finally {
      setDataLoading(false);
    }
  };

  // 处理添加流动性
  const handleAddLiquidity = async (amount0, amount1, minAmount0, minAmount1, deadline) => {
    setLoading(true);
    try {
      if (!contracts) {
        throw new Error('Contracts not initialized, please refresh the page and try again');
      }

      const { poolContract, btkContract, mtkContract } = contracts;

      console.log('Pool address:', poolContract.address);
      console.log('Amount0:', amount0.toString());
      console.log('Amount1:', amount1.toString());

      // 授权池合约使用代币
      console.log('Approving BTK...');
      const approveTx0 = await btkContract.approve(poolContract.address, amount0);
      await approveTx0.wait();
      console.log('BTK approved successfully');

      console.log('Approving MTK...');
      const approveTx1 = await mtkContract.approve(poolContract.address, amount1);
      await approveTx1.wait();
      console.log('MTK approved successfully');

      // 添加流动性
      console.log('Adding liquidity...');
      const tx = await poolContract.addLiquidity(amount0, amount1, minAmount0, minAmount1, deadline);
      const receipt = await tx.wait();
      console.log('Liquidity added successfully');

      // 从事件中获取tokenId
      const addLiquidityEvent = receipt.events.find(event =>
        event.event === 'AddLiquidity'
      );

      let tokenId;
      if (addLiquidityEvent && addLiquidityEvent.args) {
        tokenId = addLiquidityEvent.args.tokenId;
        console.log('Created NFT position ID:', tokenId.toString());
      } else {
        console.log('Unable to get position ID, but liquidity has been added');
        tokenId = 'unknown';
      }

      // 刷新仪表盘数据
      await loadDashboardData();

      return tokenId;
    } catch (error) {
      console.error('Failed to add liquidity:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-header">
          <h1 className="admin-dashboard-title">Admin Dashboard</h1>
          <button
            className="admin-dashboard-refresh-btn"
            onClick={loadDashboardData}
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
          <div className="admin-dashboard-error">
            {error}
            <button
              className="admin-dashboard-error-retry"
              onClick={loadDashboardData}
            >
              Retry
            </button>
          </div>
        )}

        {dataLoading ? (
          <div className="admin-dashboard-loading">
            <div className="admin-dashboard-spinner"></div>
            <p className="admin-dashboard-loading-text">Loading dashboard data...</p>
          </div>
        ) : (
          <div className="row">
            {/* 系统概览 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">System Overview</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="admin-dashboard-stat-title">Total Liquidity in Pool</h6>
                    <button
                      className="admin-dashboard-add-liquidity-btn"
                      onClick={() => setShowAddLiquidityModal(true)}
                      disabled={loading || dataLoading || dashboardData.paused}
                      title={dashboardData.paused ? 'Pool is paused, cannot add liquidity' : loading ? 'Processing...' : ''}
                    >
                      {loading ? 'Processing...' : 'Add Liquidity'}
                    </button>
                  </div>
                  <div className="admin-dashboard-stat">
                    <p><span className="admin-dashboard-stat-value">{dashboardData.balances.balance0}</span> <span className="admin-dashboard-stat-label">{dashboardData.token0Symbol}</span></p>
                    <p><span className="admin-dashboard-stat-value">{dashboardData.balances.balance1}</span> <span className="admin-dashboard-stat-label">{dashboardData.token1Symbol}</span></p>
                  </div>

                  <div className="admin-dashboard-stat">
                    <h6 className="admin-dashboard-stat-title">Current Parameters</h6>
                    <p>Swap Fee: <span className="admin-dashboard-stat-value">{dashboardData.swapFee}</span></p>
                    <p>Max Price Deviation: <span className="admin-dashboard-stat-value">{dashboardData.maxPriceDeviation}</span></p>
                    <p>Pool Status: <span className={`admin-dashboard-status ${dashboardData.paused ? 'admin-dashboard-status-paused' : 'admin-dashboard-status-active'}`}>
                      {dashboardData.paused ? 'Paused' : 'Active'}
                    </span></p>
                  </div>

                  <div className="admin-dashboard-stat">
                    <h6 className="admin-dashboard-stat-title">Current Exchange Rate</h6>
                    <p><span className="admin-dashboard-stat-value">1</span> <span className="admin-dashboard-stat-label">{dashboardData.token0Symbol}</span> = <span className="admin-dashboard-stat-value">{dashboardData.rate}</span> <span className="admin-dashboard-stat-label">{dashboardData.token1Symbol}</span></p>
                    <small className="admin-dashboard-note">(Note: Now using constant product model, displaying raw exchange rate)</small>
                  </div>

                  <div className="admin-dashboard-stat">
                    <h6 className="admin-dashboard-stat-title">NFT Positions</h6>
                    <p>Total Supply: <span className="admin-dashboard-stat-value">{dashboardData.totalSupply}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* 累积手续费 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">Accumulated Fees</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="admin-dashboard-stat">
                    <h6 className="admin-dashboard-stat-title">Accumulated Fees</h6>
                    <p><span className="admin-dashboard-stat-value">{dashboardData.fees.fees0}</span> <span className="admin-dashboard-stat-label">{dashboardData.token0Symbol}</span></p>
                    <p><span className="admin-dashboard-stat-value">{dashboardData.fees.fees1}</span> <span className="admin-dashboard-stat-label">{dashboardData.token1Symbol}</span></p>
                  </div>

                  <button
                    className="admin-dashboard-action-btn admin-dashboard-action-btn-primary"
                    onClick={() => navigate('/admin/fees')}
                  >
                    Manage Fees
                  </button>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="col-md-12 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">Quick Actions</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <div className="admin-dashboard-actions">
                    <button
                      className="admin-dashboard-action-btn admin-dashboard-action-btn-primary"
                      onClick={() => navigate('/admin/tokens')}
                    >
                      Token Management
                    </button>
                    <button
                      className="admin-dashboard-action-btn admin-dashboard-action-btn-primary"
                      onClick={() => window.location.href = '/admin/pool-settings'}
                    >
                      Pool Settings
                    </button>
                    <button
                      className="admin-dashboard-action-btn admin-dashboard-action-btn-primary"
                      onClick={() => navigate('/admin/positions')}
                    >
                      NFT Position Management
                    </button>
                    <button
                      className="admin-dashboard-action-btn admin-dashboard-action-btn-primary"
                      onClick={() => navigate('/admin/fees')}
                    >
                      Fee Management
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Liquidity Modal */}
      <AddLiquidityModal
        show={showAddLiquidityModal}
        onClose={() => setShowAddLiquidityModal(false)}
        onAddLiquidity={handleAddLiquidity}
        token0Symbol={dashboardData.token0Symbol}
        token1Symbol={dashboardData.token1Symbol}
      />
    </div>
  );
};

export default AdminDashboard;
