const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TransactionRecord = sequelize.define('TransactionRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  txHash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  userAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  tokenIn: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['BTK', 'MTK']]
    }
  },
  tokenOut: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['BTK', 'MTK']]
    }
  },
  amountIn: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amountOut: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slippage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'success',
    validate: {
      isIn: [['success', 'failed']]
    }
  },
  gasUsed: {
    type: DataTypes.STRING,
    defaultValue: '0'
  },
  blockNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  networkName: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = TransactionRecord;
