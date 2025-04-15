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

  // 头寸管理状态
  const [tokenId, setTokenId] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [positionInfo, setPositionInfo] = useState(null);
  const [baseURI, setBaseURI] = useState('');
  const [poolAddress, setPoolAddress] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [userTokens, setUserTokens] = useState([]);

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

        // 设置默认池地址
        setPoolAddress(contractsResult.poolContract.address);

        setDataLoading(false);
      } catch (error) {
        console.error('初始化失败:', error);
        setError('连接钱包或加载合约失败，请刷新页面重试');
        setDataLoading(false);
      }
    };

    checkAdminAndLoadData();
  }, [navigate]);

  // 查询NFT所有者
  const handleQueryOwner = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setOwnerAddress('');
    setPositionInfo(null);

    try {
      if (!tokenId || isNaN(parseInt(tokenId))) {
        throw new Error('请输入有效的Token ID');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { positionContract } = contracts;

      try {
        const owner = await positionContract.ownerOf(tokenId);
        setOwnerAddress(owner);
        setSuccess(`Token ID ${tokenId} 的所有者是: ${owner}`);

        // 同时获取头寸信息
        await handleGetPositionInfo();
      } catch (error) {
        if (error.message.includes('owner query for nonexistent token')) {
          throw new Error(`Token ID ${tokenId} 不存在`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('查询NFT所有者失败:', error);
      setError(error.message || '查询NFT所有者失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取头寸信息
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
        throw new Error('请输入有效的Token ID');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
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
          setSuccess(`已获取Token ID ${tokenId} 的头寸信息`);
        }
      } catch (error) {
        if (error.message.includes('Position does not exist')) {
          throw new Error(`Token ID ${tokenId} 不存在`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('获取头寸信息失败:', error);
      setError(error.message || '获取头寸信息失败，请重试');
    } finally {
      if (e) {
        setLoading(false);
      }
    }
  };

  // 设置基础URI
  const handleSetBaseURI = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!baseURI) {
        throw new Error('请输入基础URI');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { positionContract } = contracts;
      const tx = await positionContract.setBaseURI(baseURI);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`基础URI已成功设置为: ${baseURI}`);
      setBaseURI('');
    } catch (error) {
      console.error('设置基础URI失败:', error);
      setError(error.message || '设置基础URI失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 授权或取消授权池合约
  const handleSetPoolAuthorization = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      if (!ethers.utils.isAddress(poolAddress)) {
        throw new Error('请输入有效的池合约地址');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { positionContract } = contracts;
      const tx = await positionContract.setPoolAuthorization(poolAddress, isAuthorized);

      setTxHash(tx.hash);
      await tx.wait();

      setSuccess(`池合约 ${poolAddress} 已成功${isAuthorized ? '授权' : '取消授权'}`);
    } catch (error) {
      console.error('设置池授权失败:', error);
      setError(error.message || '设置池授权失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 查询用户拥有的所有tokenId
  const handleGetUserTokens = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setUserTokens([]);

    try {
      if (!ethers.utils.isAddress(userAddress)) {
        throw new Error('请输入有效的用户地址');
      }

      if (!contracts || !contracts.positionContract) {
        throw new Error('合约实例未初始化，请刷新页面重试');
      }

      const { positionContract } = contracts;

      try {
        const tokens = await positionContract.tokensOfOwner(userAddress);
        const tokenIds = tokens.map(token => token.toString());
        setUserTokens(tokenIds);

        if (tokenIds.length === 0) {
          setSuccess(`用户 ${userAddress} 没有拥有任何NFT头寸`);
        } else {
          setSuccess(`用户 ${userAddress} 拥有 ${tokenIds.length} 个NFT头寸`);
        }
      } catch (error) {
        console.error('查询用户头寸失败:', error);
        throw new Error('查询用户头寸失败，请重试');
      }
    } catch (error) {
      console.error('查询用户头寸失败:', error);
      setError(error.message || '查询用户头寸失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header address={address} isAdmin={true} />
      <div className="admin-dashboard-container">
        <div className="admin-dashboard-header">
          <h1 className="admin-dashboard-title">NFT头寸管理</h1>
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
            {/* 查询NFT所有者和头寸信息 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">查询NFT信息</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  <form onSubmit={handleQueryOwner} className="mb-4">
                    <div className="input-group mb-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="输入Token ID"
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
                        {loading ? '查询中...' : '查询所有者'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGetPositionInfo}
                        disabled={loading || !tokenId}
                      >
                        {loading ? '查询中...' : '查询头寸信息'}
                      </button>
                    </div>
                  </form>

                  {ownerAddress && (
                    <div className="admin-dashboard-info-box mb-3">
                      <h6>所有者信息</h6>
                      <p className="mb-0">
                        <strong>Token ID:</strong> {tokenId}
                      </p>
                      <p className="mb-0">
                        <strong>所有者地址:</strong> {ownerAddress}
                      </p>
                    </div>
                  )}

                  {positionInfo && (
                    <div className="admin-dashboard-info-box">
                      <h6>头寸信息</h6>
                      <p className="mb-0">
                        <strong>Token0 地址:</strong> {positionInfo.token0}
                      </p>
                      <p className="mb-0">
                        <strong>Token1 地址:</strong> {positionInfo.token1}
                      </p>
                      <p className="mb-0">
                        <strong>Token0 数量:</strong> {positionInfo.amount0}
                      </p>
                      <p className="mb-0">
                        <strong>Token1 数量:</strong> {positionInfo.amount1}
                      </p>
                      <p className="mb-0">
                        <strong>创建时间:</strong> {positionInfo.createdAt}
                      </p>
                    </div>
                  )}

                  {/* 查询用户拥有的所有tokenId */}
                  <form onSubmit={handleGetUserTokens} className="mt-4">
                    <h6 className="admin-dashboard-form-title">查询用户拥有的NFT</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="输入用户地址"
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
                      {loading ? '查询中...' : '查询用户NFT'}
                    </button>
                  </form>

                  {userTokens.length > 0 && (
                    <div className="admin-dashboard-info-box mt-3">
                      <h6>用户拥有的NFT头寸</h6>
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

            {/* 设置基础URI和池授权 */}
            <div className="col-md-6 mb-4">
              <div className="admin-dashboard-card">
                <div className="admin-dashboard-card-header">
                  <h5 className="admin-dashboard-card-title">NFT设置</h5>
                </div>
                <div className="admin-dashboard-card-body">
                  {/* 设置基础URI */}
                  <form onSubmit={handleSetBaseURI} className="mb-4">
                    <h6 className="admin-dashboard-form-title">设置基础URI</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="输入基础URI (例如: https://example.com/nft/)"
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
                      {loading ? '处理中...' : '设置基础URI'}
                    </button>
                  </form>

                  {/* 授权或取消授权池合约 */}
                  <form onSubmit={handleSetPoolAuthorization}>
                    <h6 className="admin-dashboard-form-title">池合约授权</h6>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="输入池合约地址"
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
                        {isAuthorized ? '授权' : '取消授权'}
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !poolAddress}
                    >
                      {loading ? '处理中...' : isAuthorized ? '授权池合约' : '取消授权池合约'}
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
