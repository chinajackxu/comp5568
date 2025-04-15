import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AddLiquidityModal = ({ show, onClose, onAddLiquidity, token0Symbol, token1Symbol }) => {
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 重置表单
  useEffect(() => {
    if (show) {
      setAmount0('');
      setAmount1('');
      setError('');
      setSuccess('');
      setLoading(false);
    }
  }, [show]);

  // 处理添加流动性
  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 验证输入
      if (!amount0 || !amount1) {
        throw new Error('请输入两种代币的金额');
      }

      // 转换为Wei
      const amount0Wei = ethers.utils.parseEther(amount0);
      const amount1Wei = ethers.utils.parseEther(amount1);

      // 设置最小接受金额（这里设为0，实际应用中应该设置合理的值）
      const minAmount0 = 0;
      const minAmount1 = 0;

      // 设置截止时间（当前时间 + 1小时）
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // 调用添加流动性函数
      const result = await onAddLiquidity(amount0Wei, amount1Wei, minAmount0, minAmount1, deadline);

      setSuccess(`成功添加流动性并创建NFT头寸，ID: ${result}`);

      // 3秒后关闭模态框
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('添加流动性失败:', error);
      setError(error.message || '添加流动性失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">添加流动性</h5>
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
              <label htmlFor="amount0" className="form-label">{token0Symbol} 金额</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  id="amount0"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  placeholder={`输入金额`}
                  disabled={loading}
                  step="0.000001"
                  min="0"
                  required
                />
                <span className="input-group-text">{token0Symbol}</span>
              </div>
              <small className="form-text text-muted">请输入要添加的 {token0Symbol} 数量</small>
            </div>

            <div className="mb-3">
              <label htmlFor="amount1" className="form-label">{token1Symbol} 金额</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  id="amount1"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  placeholder={`输入金额`}
                  disabled={loading}
                  step="0.000001"
                  min="0"
                  required
                />
                <span className="input-group-text">{token1Symbol}</span>
              </div>
              <small className="form-text text-muted">请输入要添加的 {token1Symbol} 数量</small>
            </div>

            <div className="d-grid gap-2 mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '处理中...' : '添加流动性'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddLiquidityModal;
