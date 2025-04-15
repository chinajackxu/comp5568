# OnlyDex 后端服务

这是OnlyDex应用的后端服务，用于记录交易信息和汇率变化。

## 技术栈

- Node.js
- Express
- SQLite
- Sequelize

## 安装

1. 安装依赖：

```bash
npm install
```

2. 创建`.env`文件（已提供示例）：

```
PORT=5000
DB_PATH=./data/onlydex.sqlite
NODE_ENV=development
```

## 运行

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

## API 端点

### 交易记录

- **POST /api/transactions** - 记录交易信息
- **GET /api/transactions** - 获取交易历史
  - 查询参数：
    - `userAddress` - 用户地址（可选）
    - `limit` - 每页记录数（默认10）
    - `page` - 页码（默认1）

### 汇率变化

- **POST /api/rate-changes** - 记录汇率变化
- **GET /api/rate-changes** - 获取汇率变化历史
  - 查询参数：
    - `limit` - 每页记录数（默认10）
    - `page` - 页码（默认1）

## 数据库模型

### 交易记录 (TransactionRecord)

```javascript
{
  txHash: String,              // 交易哈希
  userAddress: String,         // 用户地址
  tokenIn: String,             // 输入代币 ('BTK' 或 'MTK')
  tokenOut: String,            // 输出代币 ('BTK' 或 'MTK')
  amountIn: String,            // 输入金额
  amountOut: String,           // 输出金额
  slippage: String,            // 滑点设置
  timestamp: Date,             // 交易时间
  status: String,              // 交易状态 ('success', 'failed')
  gasUsed: String,             // 使用的gas
  blockNumber: Number,         // 区块高度
  networkName: String          // 网络名称 ('sepolia', 'mainnet' 等)
}
```

### 汇率变化记录 (RateChangeRecord)

```javascript
{
  txHash: String,              // 关联的交易哈希
  rateBefore: {                // 交易前的汇率
    btkToMtk: String,          // 1 BTK = X MTK
    mtkToBtk: String           // 1 MTK = X BTK
  },
  rateAfter: {                 // 交易后的汇率
    btkToMtk: String,          // 1 BTK = X MTK
    mtkToBtk: String           // 1 MTK = X BTK
  },
  changePercentage: {          // 变化百分比
    btkToMtk: String,          // BTK到MTK汇率变化百分比
    mtkToBtk: String           // MTK到BTK汇率变化百分比
  },
  poolBalanceBefore: {         // 交易前池中余额
    btk: String,
    mtk: String
  },
  poolBalanceAfter: {          // 交易后池中余额
    btk: String,
    mtk: String
  },
  timestamp: Date              // 记录时间
}
```

## 注意事项

1. SQLite数据库文件将自动创建在`data`目录中
2. 默认情况下，服务器在端口5000上运行
3. 在生产环境中，请确保设置适当的环境变量
4. 数据库模型将在服务器启动时自动同步
