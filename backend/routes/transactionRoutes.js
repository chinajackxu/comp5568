const express = require('express');
const router = express.Router();
const {
  recordTransaction,
  getTransactions,
  recordRateChange,
  getRateChanges
} = require('../controllers/transactionController');

// 交易记录路由
router.route('/transactions')
  .post(recordTransaction)
  .get(getTransactions);

// 汇率变化记录路由
router.route('/rate-changes')
  .post(recordRateChange)
  .get(getRateChanges);

module.exports = router;
