# OnlyDex前端应用

这是OnlyDex去中心化交易平台的前端应用，使用React开发。

## 功能

- 使用MetaMask连接到以太坊网络
- 根据用户权限自动跳转到管理员或用户界面
- 管理员功能（待实现）：管理用户权限、铸造代币、设置交易参数等
- 用户功能（待实现）：添加流动性、交换代币、查看头寸等

## 安装和运行

### 前提条件

- Node.js (v14+)
- npm 或 yarn
- MetaMask浏览器扩展

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 运行开发服务器

```bash
npm start
# 或
yarn start
```

应用将在 [http://localhost:3000](http://localhost:3000) 运行。

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

## 使用说明

1. 确保MetaMask已安装并连接到Sepolia测试网
2. 访问应用并点击"连接MetaMask"按钮
3. 根据您的权限，系统将自动跳转到管理员或用户界面

## 合约地址

应用使用以下部署在Sepolia测试网上的合约：

- **OnlyDexAccess**: 0xAEe5a17004ab160ba950aCf09EE482C8d6429541
- **BasicToken (BTK)**: 0x71680Ed98bEe5733F5f333d80F7851a6F0bBDAF7
- **MintableToken (MTK)**: 0xE91b403a1929580F4D6f1024158e825BE85c4c03
- **OnlyDexPool**: 0x8753A24D5aa379d0aB9d6c4de147b37714a5420b
- **OnlyDexPosition**: 0x716a9e81f6A50d174C35FCf6a1A55a3bA4007103
