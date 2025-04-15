# 代币合约部署项目

该项目包含两个ERC20代币合约，可以部署到Hardhat本地网络或Sepolia测试网。

## 合约说明

1. **BasicToken (BTK)**
   - 标准ERC20代币
   - 初始供应量在部署时设置

2. **MintableToken (MTK)**
   - 可增发的ERC20代币
   - 包含铸造和销毁功能
   - 只有合约所有者可以铸造新代币

## 开发环境设置

```shell
# 安装依赖项
npm install

# 编译合约
npx hardhat compile
```

## 本地部署

在Hardhat本地网络上部署合约：

```shell
# 运行本地部署脚本
npx hardhat run scripts/deploy_local.js
```

## Sepolia测试网部署

1. 首先配置`.env`文件，填写以下信息：
   - `SEPOLIA_URL`: Sepolia测试网RPC URL
   - `PRIVATE_KEY`: 你的钱包私钥（不要带0x前缀）
   - `ETHERSCAN_API_KEY`: Etherscan API密钥（可选，用于合约验证）

2. 运行Sepolia部署脚本：

```shell
npx hardhat run scripts/deploy_sepolia.js --network sepolia
```

## 其他有用的命令

```shell
# 查看可用的账户
npx hardhat accounts

# 启动本地节点
npx hardhat node

# 运行测试
npx hardhat test
```
