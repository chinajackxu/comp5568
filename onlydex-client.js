/**
 * OnlyDex 前端交互示例
 * 使用 ethers.js v6 与合约交互
 */

// 导入必要的依赖
// npm install ethers@6.x

import { ethers } from 'ethers';
import DEPLOYED_CONTRACTS from './deployed-contracts.js';
import ContractABIs from './contract-abis.js';

/**
 * OnlyDex 客户端类
 */
class OnlyDexClient {
  constructor(provider) {
    this.provider = provider;
    this.signer = null;
    this.contracts = {};
    this.addresses = DEPLOYED_CONTRACTS.addresses;
    this.abis = ContractABIs;
  }

  /**
   * 连接钱包
   * @returns {Promise<string>} 连接的钱包地址
   */
  async connectWallet() {
    if (window.ethereum) {
      try {
        // 请求用户连接
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // 创建provider和signer
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        // 初始化合约
        await this.initContracts();
        
        return await this.signer.getAddress();
      } catch (error) {
        console.error('连接钱包失败:', error);
        throw error;
      }
    } else {
      throw new Error('未检测到以太坊钱包，请安装MetaMask');
    }
  }

  /**
   * 初始化合约
   * @private
   */
  async initContracts() {
    // 初始化代币合约
    this.contracts.basicToken = new ethers.Contract(
      this.addresses.BasicToken,
      this.abis.BasicToken,
      this.signer
    );

    this.contracts.mintableToken = new ethers.Contract(
      this.addresses.MintableToken,
      this.abis.MintableToken,
      this.signer
    );

    // 初始化工厂合约
    this.contracts.factory = new ethers.Contract(
      this.addresses.OnlyDexFactory,
      this.abis.OnlyDexFactory,
      this.signer
    );

    // 初始化池合约
    this.contracts.pool = new ethers.Contract(
      this.addresses.Pool,
      this.abis.OnlyDexPool,
      this.signer
    );
  }

  /**
   * 获取代币余额
   * @param {string} tokenType - 'BTK' 或 'MTK'
   * @param {string} address - 查询地址
   * @returns {Promise<string>} 格式化后的余额
   */
  async getTokenBalance(tokenType, address) {
    const token = tokenType === 'BTK' ? this.contracts.basicToken : this.contracts.mintableToken;
    const balance = await token.balanceOf(address);
    return ethers.formatEther(balance);
  }

  /**
   * 批准代币使用权限
   * @param {string} tokenType - 'BTK' 或 'MTK'
   * @param {string} amount - 批准金额（以ETH为单位）
   * @returns {Promise<ethers.TransactionReceipt>} 交易收据
   */
  async approveToken(tokenType, amount) {
    const token = tokenType === 'BTK' ? this.contracts.basicToken : this.contracts.mintableToken;
    const amountWei = ethers.parseEther(amount);
    const tx = await token.approve(this.addresses.Pool, amountWei);
    return await tx.wait();
  }

  /**
   * 添加流动性
   * @param {string} amount0 - token0 数量（以ETH为单位）
   * @param {string} amount1 - token1 数量（以ETH为单位）
   * @returns {Promise<Object>} 包含交易收据和NFT ID
   */
  async addLiquidity(amount0, amount1) {
    const amount0Wei = ethers.parseEther(amount0);
    const amount1Wei = ethers.parseEther(amount1);
    
    const tx = await this.contracts.pool.addLiquidity(amount0Wei, amount1Wei);
    const receipt = await tx.wait();
    
    // 从事件中获取tokenId
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contracts.pool.interface.parseLog(log);
        return parsed.name === 'AddLiquidity';
      } catch (e) {
        return false;
      }
    });
    
    const parsedEvent = this.contracts.pool.interface.parseLog(event);
    const tokenId = parsedEvent.args.tokenId;
    
    return {
      receipt,
      tokenId: tokenId.toString()
    };
  }

  /**
   * 交换代币
   * @param {boolean} isToken0ToToken1 - 交换方向，true为token0到token1，false为token1到token0
   * @param {string} amountIn - 输入代币数量（以ETH为单位）
   * @returns {Promise<Object>} 包含交易收据和输出金额
   */
  async swap(isToken0ToToken1, amountIn) {
    const amountInWei = ethers.parseEther(amountIn);
    let tx;
    
    if (isToken0ToToken1) {
      tx = await this.contracts.pool.swap0to1(amountInWei);
    } else {
      tx = await this.contracts.pool.swap1to0(amountInWei);
    }
    
    const receipt = await tx.wait();
    
    // 从事件中获取输出金额
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contracts.pool.interface.parseLog(log);
        return parsed.name === 'Swap';
      } catch (e) {
        return false;
      }
    });
    
    const parsedEvent = this.contracts.pool.interface.parseLog(event);
    const amountOut = parsedEvent.args.amountOut;
    
    return {
      receipt,
      amountOut: ethers.formatEther(amountOut)
    };
  }

  /**
   * 获取代币汇率
   * @returns {Promise<string>} 汇率
   */
  async getRate() {
    const rate = await this.contracts.pool.getRate();
    return ethers.formatEther(rate);
  }

  /**
   * 获取流动性池余额
   * @returns {Promise<Object>} 包含token0和token1的余额
   */
  async getPoolBalances() {
    const [balance0, balance1] = await this.contracts.pool.getBalances();
    return {
      token0: ethers.formatEther(balance0),
      token1: ethers.formatEther(balance1)
    };
  }
}

export default OnlyDexClient;

// 使用示例
/*
// 初始化客户端
const client = new OnlyDexClient();

// 连接钱包
const userAddress = await client.connectWallet();
console.log('已连接钱包:', userAddress);

// 获取代币余额
const btkBalance = await client.getTokenBalance('BTK', userAddress);
console.log('BTK余额:', btkBalance);

// 批准代币使用权限
await client.approveToken('BTK', '10');
await client.approveToken('MTK', '10');

// 添加流动性
const { tokenId } = await client.addLiquidity('5', '5');
console.log('添加流动性成功，NFT ID:', tokenId);

// 交换代币
const { amountOut } = await client.swap(true, '1');
console.log('交换成功，获得:', amountOut);

// 获取代币汇率
const rate = await client.getRate();
console.log('当前汇率:', rate);
*/ 