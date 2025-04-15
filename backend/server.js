const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { sequelize, connectDB } = require('./config/db');
const TransactionRecord = require('./models/transactionRecord');
const RateChangeRecord = require('./models/rateChangeRecord');

// 加载环境变量
dotenv.config();

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 连接数据库
connectDB();

// 同步数据库模型
(async () => {
  try {
    await sequelize.sync();
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
})();

// 初始化Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 路由
app.use('/api', require('./routes/transactionRoutes'));

// 根路由
app.get('/', (req, res) => {
  res.send('OnlyDex API is running...');
});

// 错误处理中间件
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
