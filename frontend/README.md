# OnlyDex前端集成指南

本目录包含与OnlyDex智能合约交互所需的文件，包括合约地址、ABI和示例代码。

## 文件说明

- `contracts.js` - 包含所有合约地址和ABI的主文件
- `OnlyDexAccessABI.json` - OnlyDexAccess合约的ABI
- `BasicTokenABI.json` - BasicToken合约的ABI
- `MintableTokenABI.json` - MintableToken合约的ABI
- `OnlyDexPoolABI.json` - OnlyDexPool合约的ABI
- `OnlyDexPositionABI.json` - OnlyDexPosition合约的ABI
- `example.js` - 展示如何使用合约的示例代码

## 部署信息

- **网络**: Sepolia测试网
- **部署时间**: 2025-04-14T11:04:34.859Z

### 合约地址

- **OnlyDexAccess**: 0xAEe5a17004ab160ba950aCf09EE482C8d6429541
- **BasicToken (BTK)**: 0x71680Ed98bEe5733F5f333d80F7851a6F0bBDAF7
- **MintableToken (MTK)**: 0xE91b403a1929580F4D6f1024158e825BE85c4c03
- **OnlyDexPool**: 0x8753A24D5aa379d0aB9d6c4de147b37714a5420b
- **OnlyDexPosition**: 0x716a9e81f6A50d174C35FCf6a1A55a3bA4007103

## 使用方法

### 安装依赖

```bash
npm install ethers@5.7.2
```

### 导入合约信息

```javascript
import DEPLOYED_CONTRACTS from './contracts';
```

### 初始化合约

```javascript
import { ethers } from 'ethers';

// 连接到MetaMask
const provider = new ethers.providers.Web3Provider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = provider.getSigner();

// 初始化合约
const accessManager = new ethers.Contract(
  DEPLOYED_CONTRACTS.addresses.OnlyDexAccess,
  DEPLOYED_CONTRACTS.abis.OnlyDexAccess,
  signer
);

const btk = new ethers.Contract(
  DEPLOYED_CONTRACTS.addresses.BasicToken,
  DEPLOYED_CONTRACTS.abis.BasicToken,
  signer
);

const mtk = new ethers.Contract(
  DEPLOYED_CONTRACTS.addresses.MintableToken,
  DEPLOYED_CONTRACTS.abis.MintableToken,
  signer
);

const pool = new ethers.Contract(
  DEPLOYED_CONTRACTS.addresses.OnlyDexPool,
  DEPLOYED_CONTRACTS.abis.OnlyDexPool,
  signer
);

const positionNFT = new ethers.Contract(
  DEPLOYED_CONTRACTS.addresses.OnlyDexPosition,
  DEPLOYED_CONTRACTS.abis.OnlyDexPosition,
  signer
);
```

### 示例操作

请参考`example.js`文件，其中包含以下示例操作：

- 连接到以太坊网络
- 初始化合约
- 获取代币余额
- 添加流动性
- 交换代币

## 注意事项

- 确保MetaMask已连接到Sepolia测试网
- 确保账户中有足够的Sepolia测试网ETH用于支付gas费
- 在进行任何操作前，确保账户中有足够的BTK和MTK代币

## 获取测试代币

您可以通过以下方式获取测试代币：

1. 联系项目管理员请求测试代币
2. 使用管理员账户调用代币合约的mint函数铸造代币

## 更多信息

有关OnlyDex项目的更多信息，请访问项目GitHub仓库或联系项目团队。
