/**
 * OnlyDex - 已部署合约地址
 * 网络: Sepolia测试网
 * 部署时间: ${new Date().toISOString()}
 * 部署账户: 0x9C526f16085865F876e9f14cA28FeF89D26DEaAA
 */

const DEPLOYED_CONTRACTS = {
  // 合约地址
  addresses: {
    OnlyDexAccess: '0x20bfCc1DDeB4f38fFC8821e8bE27Bf8f506a7763',
    OnlyDexFactory: '0x6D2Be2B04466E52d0F5C21e3106f4Fd9e0C2f188',
    BasicToken: '0xd4Cf36C5Db5AD21eaE22f08823F22A38b7865193',
    MintableToken: '0x0A629b8d227605139D0737E47Dcdc971534D6d9c',
    Pool: '0xa280C56D8786a6e7664ca1A292431cd5a5c801A5'
  },
  
  // 网络信息
  network: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/Hf8qOSrmaLlSjevJ8qYaYQiTzLp2oEIi'
  },
  
  // 代币信息
  tokens: {
    BTK: {
      address: '0xd4Cf36C5Db5AD21eaE22f08823F22A38b7865193',
      name: 'BasicToken',
      symbol: 'BTK',
      decimals: 18
    },
    MTK: {
      address: '0x0A629b8d227605139D0737E47Dcdc971534D6d9c',
      name: 'MintableToken',
      symbol: 'MTK',
      decimals: 18
    }
  }
};

// CommonJS模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEPLOYED_CONTRACTS;
}

// ES模块导出
export default DEPLOYED_CONTRACTS; 