import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AddLiquidityModal = ({ show, onClose, onAddLiquidity, token0Symbol, token1Symbol }) => {
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Reset form
  useEffect(() => {
    if (show) {
      setAmount0('');
      setAmount1('');
      setError('');
      setSuccess('');
      setLoading(false);
    }
  }, [show]);

  // Handle add liquidity
  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 验证输入
      if (!amount0 || !amount1) {
        throw new Error('Please enter amounts for both tokens');
      }

      // Convert to Wei
      const amount0Wei = ethers.utils.parseEther(amount0);
      const amount1Wei = ethers.utils.parseEther(amount1);

      // Set minimum accepted amounts (set to 0 here, should be a reasonable value in real applications)
      const minAmount0 = 0;
      const minAmount1 = 0;

      // Set deadline (current time + 1 hour)
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Call add liquidity function
      const result = await onAddLiquidity(amount0Wei, amount1Wei, minAmount0, minAmount1, deadline);

      setSuccess(`Successfully added liquidity and created NFT position, ID: ${result}`);

      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Failed to add liquidity:', error);
      setError(error.message || 'Failed to add liquidity, please try again');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Add Liquidity</h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <form onSubmit={handleAddLiquidity}>
            <div className="mb-3">
              <label htmlFor="amount0" className="form-label">{token0Symbol} Amount</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  id="amount0"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  placeholder={`Enter amount`}
                  disabled={loading}
                  step="0.000001"
                  min="0"
                  required
                />
                <span className="input-group-text">{token0Symbol}</span>
              </div>
              <small className="form-text text-muted">Please enter the amount of {token0Symbol} to add</small>
            </div>

            <div className="mb-3">
              <label htmlFor="amount1" className="form-label">{token1Symbol} Amount</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  id="amount1"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  placeholder={`Enter amount`}
                  disabled={loading}
                  step="0.000001"
                  min="0"
                  required
                />
                <span className="input-group-text">{token1Symbol}</span>
              </div>
              <small className="form-text text-muted">Please enter the amount of {token1Symbol} to add</small>
            </div>

            <div className="d-grid gap-2 mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Add Liquidity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddLiquidityModal;
