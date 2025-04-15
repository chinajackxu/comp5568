const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RateChangeRecord = sequelize.define('RateChangeRecord', {
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
  // 交易前的汇率
  rateBeforeBtkToMtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rateBeforeMtkToBtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 交易后的汇率
  rateAfterBtkToMtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rateAfterMtkToBtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 变化百分比
  changePercentageBtkToMtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  changePercentageMtkToBtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 交易前池中余额
  poolBalanceBeforeBtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  poolBalanceBeforeMtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 交易后池中余额
  poolBalanceAfterBtk: {
    type: DataTypes.STRING,
    allowNull: false
  },
  poolBalanceAfterMtk: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = RateChangeRecord;
