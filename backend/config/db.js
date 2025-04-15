const { Sequelize } = require('sequelize');
const path = require('path');

// 使用环境变量中的数据库路径，或者使用默认路径
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/onlydex.sqlite');

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// 测试数据库连接
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
