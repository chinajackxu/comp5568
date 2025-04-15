/**
 * OnlyDex - 已部署合约地址和ABI
 * 网络: sepolia
 * 部署时间: 2025-04-14T11:04:34.859Z
 */

// 导入ABI
import OnlyDexAccessABI from './OnlyDexAccessABI.json';
import BasicTokenABI from './BasicTokenABI.json';
import MintableTokenABI from './MintableTokenABI.json';
import OnlyDexPoolABI from './OnlyDexPoolABI.json';
import OnlyDexPositionABI from './OnlyDexPositionABI.json';

// 合约地址
const DEPLOYED_CONTRACTS = {
  // 合约地址
  addresses: {
    OnlyDexAccess: '0xAEe5a17004ab160ba950aCf09EE482C8d6429541',
    BasicToken: '0x71680Ed98bEe5733F5f333d80F7851a6F0bBDAF7',
    MintableToken: '0xE91b403a1929580F4D6f1024158e825BE85c4c03',
    OnlyDexPool: '0x8753A24D5aa379d0aB9d6c4de147b37714a5420b',
    OnlyDexPosition: '0x716a9e81f6A50d174C35FCf6a1A55a3bA4007103'
  },
  
  // 网络信息
  network: {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY'
  },
  
  // 代币信息
  tokens: {
    BTK: {
      address: '0x71680Ed98bEe5733F5f333d80F7851a6F0bBDAF7',
      name: 'BasicToken',
      symbol: 'BTK',
      decimals: 18
    },
    MTK: {
      address: '0xE91b403a1929580F4D6f1024158e825BE85c4c03',
      name: 'MintableToken',
      symbol: 'MTK',
      decimals: 18
    }
  },
  
  // 合约ABI
  abis: {
    OnlyDexAccess: OnlyDexAccessABI,
    BasicToken: BasicTokenABI,
    MintableToken: MintableTokenABI,
    OnlyDexPool: OnlyDexPoolABI,
    OnlyDexPosition: OnlyDexPositionABI
  }
};

export default DEPLOYED_CONTRACTS;
