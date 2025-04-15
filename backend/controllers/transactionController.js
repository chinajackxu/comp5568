const TransactionRecord = require('../models/transactionRecord');
const RateChangeRecord = require('../models/rateChangeRecord');
const { Op } = require('sequelize');

// @desc    记录交易信息
// @route   POST /api/transactions
// @access  Public
const recordTransaction = async (req, res) => {
  try {
    const {
      txHash,
      userAddress,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      slippage,
      status,
      gasUsed,
      blockNumber,
      networkName
    } = req.body;

    // 验证必要字段
    if (!txHash || !userAddress || !tokenIn || !tokenOut || !amountIn || !amountOut || !networkName) {
      return res.status(400).json({ message: '缺少必要字段' });
    }

    // 检查交易是否已存在
    const existingTransaction = await TransactionRecord.findOne({ where: { txHash } });
    if (existingTransaction) {
      return res.status(400).json({ message: '交易记录已存在' });
    }

    // 创建新交易记录
    const transaction = await TransactionRecord.create({
      txHash,
      userAddress,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      slippage,
      status: status || 'success',
      gasUsed: gasUsed || '0',
      blockNumber: blockNumber || 0,
      networkName
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('记录交易信息失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// @desc    获取交易历史
// @route   GET /api/transactions
// @access  Public
const getTransactions = async (req, res) => {
  try {
    const { userAddress, limit = 10, page = 1 } = req.query;

    // 构建查询条件
    const where = {};
    if (userAddress) {
      where.userAddress = userAddress;
    }

    // 计算分页
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 查询交易记录
    const { count, rows: transactions } = await TransactionRecord.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.status(200).json({
      transactions,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      total: count
    });
  } catch (error) {
    console.error('获取交易历史失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// @desc    记录汇率变化
// @route   POST /api/rate-changes
// @access  Public
const recordRateChange = async (req, res) => {
  try {
    const {
      txHash,
      rateBefore,
      rateAfter,
      changePercentage,
      poolBalanceBefore,
      poolBalanceAfter
    } = req.body;

    // 验证必要字段
    if (!txHash || !rateBefore || !rateAfter || !changePercentage || !poolBalanceBefore || !poolBalanceAfter) {
      return res.status(400).json({ message: '缺少必要字段' });
    }

    // 检查记录是否已存在
    const existingRecord = await RateChangeRecord.findOne({ where: { txHash } });
    if (existingRecord) {
      return res.status(400).json({ message: '汇率变化记录已存在' });
    }

    // 创建新汇率变化记录
    const rateChange = await RateChangeRecord.create({
      txHash,
      rateBeforeBtkToMtk: rateBefore.btkToMtk,
      rateBeforeMtkToBtk: rateBefore.mtkToBtk,
      rateAfterBtkToMtk: rateAfter.btkToMtk,
      rateAfterMtkToBtk: rateAfter.mtkToBtk,
      changePercentageBtkToMtk: changePercentage.btkToMtk,
      changePercentageMtkToBtk: changePercentage.mtkToBtk,
      poolBalanceBeforeBtk: poolBalanceBefore.btk,
      poolBalanceBeforeMtk: poolBalanceBefore.mtk,
      poolBalanceAfterBtk: poolBalanceAfter.btk,
      poolBalanceAfterMtk: poolBalanceAfter.mtk
    });

    res.status(201).json(rateChange);
  } catch (error) {
    console.error('记录汇率变化失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// @desc    获取汇率变化历史
// @route   GET /api/rate-changes
// @access  Public
const getRateChanges = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;

    // 计算分页
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 查询汇率变化记录
    const { count, rows: rateChanges } = await RateChangeRecord.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // 将数据转换为前端期望的格式
    const formattedRateChanges = rateChanges.map(record => ({
      id: record.id,
      txHash: record.txHash,
      rateBefore: {
        btkToMtk: record.rateBeforeBtkToMtk,
        mtkToBtk: record.rateBeforeMtkToBtk
      },
      rateAfter: {
        btkToMtk: record.rateAfterBtkToMtk,
        mtkToBtk: record.rateAfterMtkToBtk
      },
      changePercentage: {
        btkToMtk: record.changePercentageBtkToMtk,
        mtkToBtk: record.changePercentageMtkToBtk
      },
      poolBalanceBefore: {
        btk: record.poolBalanceBeforeBtk,
        mtk: record.poolBalanceBeforeMtk
      },
      poolBalanceAfter: {
        btk: record.poolBalanceAfterBtk,
        mtk: record.poolBalanceAfterMtk
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }));

    res.status(200).json({
      rateChanges: formattedRateChanges,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      total: count
    });
  } catch (error) {
    console.error('获取汇率变化历史失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = {
  recordTransaction,
  getTransactions,
  recordRateChange,
  getRateChanges
};
