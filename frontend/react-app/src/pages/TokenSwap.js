import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { initializeContracts, formatTokenAmount, formatRate } from '../utils/contracts';
import { ethers } from 'ethers';
import '../user-dashboard.css';
import '../token-swap.css';

const TokenSwap = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [swapLoading, setSwapLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [txHash, setTxHash] = useState('');
  const [networkName, setNetworkName] = useState('');

  // Swap state
  const [tokenIn, setTokenIn] = useState('btk'); // 'btk' or 'mtk'
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('0');
  const [slippage, setSlippage] = useState('1.0'); // Default slippage 1.0%
  const [deadline, setDeadline] = useState('20'); // Default 20 minutes
  const [currentRate, setCurrentRate] = useState('0');
  const [inverseRateWithFee, setInverseRateWithFee] = useState('0');
  const [swapFee, setSwapFee] = useState('0');
  const [balances, setBalances] = useState({
    btk: '0',
    mtk: '0'
  });
  const [allowances, setAllowances] = useState({
    btk: '0',
    mtk: '0'
  });
  const [approving, setApproving] = useState(false);

  // Initialization
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize contracts
        const contractsResult = await initializeContracts();
        const { address, poolContract, btkContract, mtkContract } = contractsResult;

        setAddress(address);
        setContracts(contractsResult);

        // Get network name
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        setNetworkName(network.name);

        // Load data
        await loadData(address, poolContract, btkContract, mtkContract);

        setLoading(false);
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to connect wallet or load contracts, please refresh the page and try again');
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Load data
  const loadData = async (userAddress, poolContract, btkContract, mtkContract) => {
    try {
      // Get token balances
      try {
        const btkBalance = await btkContract.balanceOf(userAddress);
        const mtkBalance = await mtkContract.balanceOf(userAddress);

        setBalances({
          btk: formatTokenAmount(btkBalance),
          mtk: formatTokenAmount(mtkBalance)
        });
      } catch (error) {
        console.error('Failed to get token balances:', error);
      }

      // Get token allowances
      try {
        const btkAllowance = await btkContract.allowance(userAddress, poolContract.address);
        const mtkAllowance = await mtkContract.allowance(userAddress, poolContract.address);

        setAllowances({
          btk: formatTokenAmount(btkAllowance),
          mtk: formatTokenAmount(mtkAllowance)
        });
      } catch (error) {
        console.error('Failed to get allowances:', error);
      }

      // Get swap fee
      try {
        const fee = await poolContract.swapFee();
        const feePercent = (fee.toNumber() / 100).toFixed(2); // Convert to percentage
        setSwapFee(feePercent);

        // Get current exchange rate
        const rate = await poolContract.getRate();
        setCurrentRate(formatRate(rate));

        // Calculate inverse rate
        const poolBtkBalance = await btkContract.balanceOf(poolContract.address);
        const poolMtkBalance = await mtkContract.balanceOf(poolContract.address);
        const rawInverseRate = ethers.utils.formatUnits(poolBtkBalance, 18) / ethers.utils.formatUnits(poolMtkBalance, 18);
        const feeRate = parseFloat(feePercent) / 100;
        const inverseRate = rawInverseRate * (1 - feeRate);
        setInverseRateWithFee(inverseRate);
      } catch (error) {
        console.error('Failed to get exchange rate or swap fee:', error);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data, please refresh the page and try again');
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    if (!contracts) {
      setError('Contract instance not initialized, please refresh the page and try again');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { address, poolContract, btkContract, mtkContract } = contracts;
      await loadData(address, poolContract, btkContract, mtkContract);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data, please try again');
    } finally {
      setLoading(false);
    }
  };

  // Switch input token
  const handleSwitchTokens = () => {
    setTokenIn(tokenIn === 'btk' ? 'mtk' : 'btk');
    setAmountIn('');
    setAmountOut('0');
  };

  // Calculate output amount
  const calculateOutput = async () => {
    if (!contracts || !amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut('0');
      return;
    }

    try {
      const { poolContract, btkContract, mtkContract } = contracts;
      const amountInWei = ethers.utils.parseEther(amountIn);

      // Get current exchange rate
      const rate = await poolContract.getRate();
      const formattedRate = formatRate(rate);

      // Get pool balances
      const balance0 = await btkContract.balanceOf(poolContract.address);
      const balance1 = await mtkContract.balanceOf(poolContract.address);

      // Calculate inverse rate (considering fee)
      const feeRate = parseFloat(swapFee) / 100;
      const rawInverseRate = ethers.utils.formatUnits(balance0, 18) / ethers.utils.formatUnits(balance1, 18);
      const inverseRateWithFee = rawInverseRate * (1 - feeRate);
      console.log('Inverse rate calculation:', rawInverseRate, '*', (1 - feeRate), '=', inverseRateWithFee);

      // Manually calculate output amount
      let estimatedOutput;
      if (tokenIn === 'btk') {
        // BTK -> MTK
        // Rate already considers fee
        estimatedOutput = parseFloat(amountIn) * parseFloat(formattedRate);
        console.log('BTK -> MTK calculation:', parseFloat(amountIn), '*', parseFloat(formattedRate), '=', estimatedOutput);
      } else {
        // MTK -> BTK
        // Use correct inverse rate (already considering fee)
        estimatedOutput = parseFloat(amountIn) * inverseRateWithFee;
        console.log('MTK -> BTK calculation:', parseFloat(amountIn), '*', inverseRateWithFee, '=', estimatedOutput);
      }

      // Slightly reduce expected output in frontend display to increase success rate
      estimatedOutput = estimatedOutput * 0.995; // Subtract 0.5% as safety margin
      console.log('Adjusted expected output:', estimatedOutput);

      setAmountOut(estimatedOutput.toFixed(6));
    } catch (error) {
      console.error('Failed to calculate output amount:', error);
      setAmountOut('0');
    }
  };

  // Calculate output amount when input amount changes
  useEffect(() => {
    calculateOutput();
  }, [amountIn, tokenIn, contracts]);

  // Approve token
  const handleApprove = async () => {
    if (!contracts || !amountIn || parseFloat(amountIn) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setApproving(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      const { poolContract, btkContract, mtkContract } = contracts;
      const tokenContract = tokenIn === 'btk' ? btkContract : mtkContract;

      // Use large approval amount to avoid frequent approvals
      const amountInWei = ethers.utils.parseEther('1000000');

      // Approve token
      const tx = await tokenContract.approve(poolContract.address, amountInWei);
      setTxHash(tx.hash);

      await tx.wait();

      // Update allowance
      const newAllowance = await tokenContract.allowance(address, poolContract.address);
      setAllowances({
        ...allowances,
        [tokenIn]: formatTokenAmount(newAllowance)
      });

      // Automatically swap after successful approval
      setSuccess('Approval successful! Proceeding with swap...');

      // Wait a moment, then automatically proceed with swap
      setTimeout(() => {
        handleSwap();
      }, 1000);
    } catch (error) {
      console.error('Approval failed:', error);

      // Handle specific types of approval errors
      if (error.code === 4001) {
        // User cancelled approval
        setError('You cancelled the approval operation.');
      } else if (error.message && error.message.includes('insufficient funds')) {
        // Insufficient funds
        setError('Approval failed: Insufficient funds, please ensure you have enough ETH for gas fees.');
      } else if (error.message && error.message.includes('gas')) {
        // Gas-related errors
        setError('Approval failed: Gas fee estimation error, please try increasing the gas limit.');
      } else {
        // Other errors
        setError(error.message || 'Approval failed, please try again');
      }
    } finally {
      setApproving(false);
    }
  };

  // Record transaction information to backend database
  const recordTransaction = async (txHash, status, amountIn, amountOut, gasUsed = '0', blockNumber = 0) => {
    try {
      // This will call the backend API in the future
      console.log('Recording transaction information:', {
        txHash,
        userAddress: address,
        tokenIn: tokenIn.toUpperCase(),
        tokenOut: tokenIn === 'btk' ? 'MTK' : 'BTK',
        amountIn,
        amountOut,
        slippage,
        timestamp: new Date(),
        status,
        gasUsed,
        blockNumber,
        networkName
      });

      // Call backend API
      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          userAddress: address,
          tokenIn: tokenIn.toUpperCase(),
          tokenOut: tokenIn === 'btk' ? 'MTK' : 'BTK',
          amountIn,
          amountOut,
          slippage,
          status,
          gasUsed,
          blockNumber,
          networkName
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to record transaction information:', error);
    }
  };

  // Record exchange rate changes
  const recordRateChange = async (txHash, rateBefore, rateAfter, balanceBefore, balanceAfter) => {
    try {
      // Calculate exchange rate change percentage
      const btkToMtkChange = ((parseFloat(rateAfter.btkToMtk) - parseFloat(rateBefore.btkToMtk)) / parseFloat(rateBefore.btkToMtk) * 100).toFixed(4);
      const mtkToBtkChange = ((parseFloat(rateAfter.mtkToBtk) - parseFloat(rateBefore.mtkToBtk)) / parseFloat(rateBefore.mtkToBtk) * 100).toFixed(4);

      console.log('Recording exchange rate changes:', {
        txHash,
        rateBefore,
        rateAfter,
        changePercentage: {
          btkToMtk: btkToMtkChange,
          mtkToBtk: mtkToBtkChange
        },
        poolBalanceBefore: balanceBefore,
        poolBalanceAfter: balanceAfter,
        timestamp: new Date()
      });

      // Call backend API
      const response = await fetch('http://localhost:5000/api/rate-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          rateBefore,
          rateAfter,
          changePercentage: {
            btkToMtk: btkToMtkChange,
            mtkToBtk: mtkToBtkChange
          },
          poolBalanceBefore: balanceBefore,
          poolBalanceAfter: balanceAfter
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to record exchange rate changes:', error);
    }
  };

  // Execute swap
  const handleSwap = async () => {
    if (!contracts || !amountIn || parseFloat(amountIn) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Check balance
    if (parseFloat(amountIn) > parseFloat(balances[tokenIn])) {
      setError(`Insufficient ${tokenIn.toUpperCase()} balance`);
      return;
    }

    // Check allowance
    if (parseFloat(amountIn) > parseFloat(allowances[tokenIn])) {
      setError(`Please approve ${tokenIn.toUpperCase()} first`);
      return;
    }

    setSwapLoading(true);
    setError('');
    setSuccess('');
    setTxHash('');

    try {
      const { poolContract, btkContract, mtkContract } = contracts;
      const amountInWei = ethers.utils.parseEther(amountIn);

      // Calculate expected output amount
      const estimatedOutput = parseFloat(amountOut);
      const estimatedOutputWei = ethers.utils.parseEther(estimatedOutput.toString());

      // Calculate minimum output amount (considering slippage)
      // Increase slippage tolerance to ensure transaction success
      const slippagePercent = parseFloat(slippage) / 100;
      // Use a more conservative calculation method, add extra safety margin
      const minAmountOut = estimatedOutput * (1 - slippagePercent - 0.005); // Subtract an extra 0.5% as safety margin
      console.log('Minimum output amount calculation:', estimatedOutput, '*', (1 - slippagePercent - 0.005), '=', minAmountOut);

      // Ensure minimum output amount is greater than 0
      const safeMinAmountOut = Math.max(minAmountOut, 0.000001); // Ensure minimum value is not too small
      const minAmountOutWei = ethers.utils.parseEther(safeMinAmountOut.toFixed(18));

      // Calculate deadline
      const deadlineMinutes = parseInt(deadline);
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;

      // Get exchange rate and pool balance before transaction
      const rateBefore = await poolContract.getRate();
      const formattedRateBefore = formatRate(rateBefore);

      // Calculate inverse rate
      const poolBtkBalanceBefore = await btkContract.balanceOf(poolContract.address);
      const poolMtkBalanceBefore = await mtkContract.balanceOf(poolContract.address);
      const rawInverseRateBefore = ethers.utils.formatUnits(poolBtkBalanceBefore, 18) / ethers.utils.formatUnits(poolMtkBalanceBefore, 18);
      const feeRate = parseFloat(swapFee) / 100;
      const inverseRateWithFeeBefore = rawInverseRateBefore * (1 - feeRate);

      // Record exchange rate and pool balance before transaction
      const rateBeforeData = {
        btkToMtk: formattedRateBefore,
        mtkToBtk: inverseRateWithFeeBefore.toFixed(6)
      };

      const poolBalanceBeforeData = {
        btk: formatTokenAmount(poolBtkBalanceBefore),
        mtk: formatTokenAmount(poolMtkBalanceBefore)
      };

      // Execute swap
      let tx;
      if (tokenIn === 'btk') {
        // BTK -> MTK, use swap0to1
        tx = await poolContract.swap0to1(
          amountInWei,
          minAmountOutWei,
          deadlineTimestamp
        );
      } else {
        // MTK -> BTK, use swap1to0
        tx = await poolContract.swap1to0(
          amountInWei,
          minAmountOutWei,
          deadlineTimestamp
        );
      }

      setTxHash(tx.hash);
      const receipt = await tx.wait();

      // Update balances
      const btkBalance = await btkContract.balanceOf(address);
      const mtkBalance = await mtkContract.balanceOf(address);

      setBalances({
        btk: formatTokenAmount(btkBalance),
        mtk: formatTokenAmount(mtkBalance)
      });

      // Get exchange rate and pool balance after transaction
      const rateAfter = await poolContract.getRate();
      const formattedRateAfter = formatRate(rateAfter);
      setCurrentRate(formattedRateAfter);

      // Calculate inverse rate after transaction
      const poolBtkBalanceAfter = await btkContract.balanceOf(poolContract.address);
      const poolMtkBalanceAfter = await mtkContract.balanceOf(poolContract.address);
      const rawInverseRateAfter = ethers.utils.formatUnits(poolBtkBalanceAfter, 18) / ethers.utils.formatUnits(poolMtkBalanceAfter, 18);
      const inverseRateWithFeeAfter = rawInverseRateAfter * (1 - feeRate);

      // Record exchange rate and pool balance after transaction
      const rateAfterData = {
        btkToMtk: formattedRateAfter,
        mtkToBtk: inverseRateWithFeeAfter.toFixed(6)
      };

      const poolBalanceAfterData = {
        btk: formatTokenAmount(poolBtkBalanceAfter),
        mtk: formatTokenAmount(poolMtkBalanceAfter)
      };

      // Record transaction information and exchange rate changes
      await recordTransaction(
        tx.hash,
        'success',
        amountIn,
        estimatedOutput.toString(),
        receipt.gasUsed?.toString() || '0',
        receipt.blockNumber
      );

      await recordRateChange(
        tx.hash,
        rateBeforeData,
        rateAfterData,
        poolBalanceBeforeData,
        poolBalanceAfterData
      );

      // Update allowances
      const btkAllowance = await btkContract.allowance(address, poolContract.address);
      const mtkAllowance = await mtkContract.allowance(address, poolContract.address);

      setAllowances({
        btk: formatTokenAmount(btkAllowance),
        mtk: formatTokenAmount(mtkAllowance)
      });

      setSuccess('Swap successful!');
      setAmountIn('');
      setAmountOut('0');

      // Show link to view transaction history
      setTimeout(() => {
        setSuccess('Swap successful! You can view details in transaction history.');
      }, 1000);
    } catch (error) {
      console.error('Swap failed:', error);

      // Failed transactions are not recorded in the database
      console.log('Transaction failed, not recording to database');

      // Handle specific types of errors
      if (error.code === 4001) {
        // User cancelled transaction
        setError('You cancelled the transaction.');
      } else if (error.message && error.message.includes('execution reverted: Output below minimum')) {
        // Exceeded slippage limit
        setError(`Transaction failed: Output amount below minimum limit, please increase slippage tolerance or try again later. Current slippage setting: ${slippage}%`);
      } else if (error.message && error.message.includes('insufficient funds')) {
        // Insufficient funds
        setError('Transaction failed: Insufficient funds, please ensure you have enough tokens and gas fees.');
      } else if (error.message && error.message.includes('deadline')) {
        // Exceeded deadline
        setError('Transaction failed: Exceeded transaction deadline, please try again.');
      } else if (error.message && error.message.includes('gas')) {
        // Gas-related errors
        setError('Transaction failed: Gas fee estimation error, please try increasing the gas limit or reducing the transaction amount.');
      } else {
        // Other errors
        setError(error.message || 'Swap failed, please try again');
      }
    } finally {
      setSwapLoading(false);
    }
  };

  // Set maximum amount
  const handleSetMax = () => {
    setAmountIn(balances[tokenIn]);
  };

  return (
    <div>
      <Header address={address} isAdmin={false} />
      <div className="user-dashboard-container">
        <div className="user-dashboard-header">
          <h1 className="user-dashboard-title">Token Swap</h1>
          <button
            className="user-dashboard-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="token-swap-error">
            {error}
            {error.includes('滑点') && (
              <div className="token-swap-error-action">
                <button
                  className="token-swap-error-btn"
                  onClick={() => setSlippage((parseFloat(slippage) + 0.5).toString())}
                >
                  Increase Slippage Tolerance
                </button>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="user-dashboard-success">
            {success}
            <div className="user-dashboard-success-actions">
              {txHash && (
                <a
                  href={`https://${networkName === 'homestead' ? '' : networkName + '.'}etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="user-dashboard-tx-link"
                >
                  View Transaction
                </a>
              )}
              {success.includes('Swap successful') && (
                <Link
                  to="/user/history"
                  className="user-dashboard-history-link"
                >
                  View Transaction History
                </Link>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="user-dashboard-loading">
            <div className="user-dashboard-spinner"></div>
            <p className="user-dashboard-loading-text">Loading...</p>
          </div>
        ) : (
          <div className="row">
            {/* Swap Card */}
            <div className="col-md-8 mx-auto mb-4">
              <div className="user-dashboard-card">
                <div className="user-dashboard-card-header">
                  <h5 className="user-dashboard-card-title">Swap Tokens</h5>
                </div>
                <div className="user-dashboard-card-body">
                  <div className="token-swap-info mb-4">
                    <div className="token-swap-info-item">
                      <span>Current Rate:</span>
                      {tokenIn === 'btk' ? (
                        <span>1 BTK = {currentRate} MTK</span>
                      ) : (
                        <span>1 MTK = {inverseRateWithFee.toFixed(6)} BTK</span>
                      )}
                    </div>
                    <div className="token-swap-info-item">
                      <span>Swap Fee:</span>
                      <span>{swapFee}%</span>
                    </div>
                  </div>

                  <div className="token-swap-form">
                    {/* Input Amount */}
                    <div className="token-swap-input-container">
                      <div className="token-swap-input-header">
                        <span>From {tokenIn.toUpperCase()}</span>
                        <span>Balance: {balances[tokenIn]} {tokenIn.toUpperCase()}</span>
                      </div>
                      <div className="token-swap-input-group">
                        <input
                          type="number"
                          className="token-swap-input"
                          placeholder="0.0"
                          value={amountIn}
                          onChange={(e) => setAmountIn(e.target.value)}
                          disabled={swapLoading || approving}
                        />
                        <div className="token-swap-input-actions">
                          <button
                            className="token-swap-max-btn"
                            onClick={handleSetMax}
                            disabled={swapLoading || approving}
                          >
                            Max
                          </button>
                          <div className="token-swap-token-selector">
                            {tokenIn.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Switch Button */}
                    <div className="token-swap-switch-container">
                      <button
                        className="token-swap-switch-btn"
                        onClick={handleSwitchTokens}
                        disabled={swapLoading || approving}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                      </button>
                    </div>

                    {/* Output Amount */}
                    <div className="token-swap-input-container">
                      <div className="token-swap-input-header">
                        <span>To {tokenIn === 'btk' ? 'MTK' : 'BTK'}</span>
                        <span>Balance: {balances[tokenIn === 'btk' ? 'mtk' : 'btk']} {tokenIn === 'btk' ? 'MTK' : 'BTK'}</span>
                      </div>
                      <div className="token-swap-input-group">
                        <input
                          type="text"
                          className="token-swap-input"
                          placeholder="0.0"
                          value={amountOut}
                          readOnly
                        />
                        <div className="token-swap-input-actions">
                          <div className="token-swap-token-selector">
                            {tokenIn === 'btk' ? 'MTK' : 'BTK'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Slippage Settings */}
                    <div className="token-swap-settings">
                      <div className="token-swap-settings-item">
                        <span>Slippage Tolerance</span>
                        <div className="token-swap-settings-input-group">
                          <input
                            type="number"
                            className="token-swap-settings-input"
                            value={slippage}
                            onChange={(e) => setSlippage(e.target.value)}
                            disabled={swapLoading || approving}
                            min="0.1"
                            max="10"
                            step="0.1"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      <div className="token-swap-settings-item">
                        <span>Transaction Deadline</span>
                        <div className="token-swap-settings-input-group">
                          <input
                            type="number"
                            className="token-swap-settings-input"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            disabled={swapLoading || approving}
                            min="1"
                            max="60"
                          />
                          <span>minutes</span>
                        </div>
                      </div>
                    </div>

                    {/* Swap Button */}
                    <div className="token-swap-actions">
                      {parseFloat(amountIn) > parseFloat(allowances[tokenIn]) ? (
                        <button
                          className="token-swap-btn token-swap-approve-btn"
                          onClick={handleApprove}
                          disabled={!amountIn || parseFloat(amountIn) <= 0 || approving || swapLoading}
                        >
                          {approving ? 'Approving...' : `Approve ${tokenIn.toUpperCase()}`}
                        </button>
                      ) : (
                        <button
                          className="token-swap-btn token-swap-swap-btn"
                          onClick={handleSwap}
                          disabled={!amountIn || parseFloat(amountIn) <= 0 || parseFloat(amountIn) > parseFloat(balances[tokenIn]) || swapLoading || approving}
                        >
                          {swapLoading ? 'Swapping...' : 'Swap'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenSwap;
