/**
 * OnlyDex - 合约交互示例
 */

import { ethers } from 'ethers';
import DEPLOYED_CONTRACTS from './contracts';

// 连接到以太坊网络
async function connectToEthereum() {
  // 检查是否有MetaMask
  if (window.ethereum) {
    try {
      // 请求用户连接
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 创建provider和signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      console.log('Connected to MetaMask:', address);
      
      return { provider, signer, address };
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      throw error;
    }
  } else {
    console.error('MetaMask not found. Please install MetaMask.');
    throw new Error('MetaMask not found');
  }
}

// 初始化合约
function initializeContracts(signer) {
  const { addresses, abis } = DEPLOYED_CONTRACTS;
  
  const contracts = {
    accessManager: new ethers.Contract(addresses.OnlyDexAccess, abis.OnlyDexAccess, signer),
    btk: new ethers.Contract(addresses.BasicToken, abis.BasicToken, signer),
    mtk: new ethers.Contract(addresses.MintableToken, abis.MintableToken, signer),
    pool: new ethers.Contract(addresses.OnlyDexPool, abis.OnlyDexPool, signer),
    positionNFT: new ethers.Contract(addresses.OnlyDexPosition, abis.OnlyDexPosition, signer)
  };
  
  return contracts;
}

// 获取代币余额
async function getTokenBalances(contracts, address) {
  const btkBalance = await contracts.btk.balanceOf(address);
  const mtkBalance = await contracts.mtk.balanceOf(address);
  
  return {
    btk: ethers.utils.formatEther(btkBalance),
    mtk: ethers.utils.formatEther(mtkBalance)
  };
}

// 添加流动性
async function addLiquidity(contracts, amount0, amount1) {
  // 将ETH金额转换为Wei
  const amount0Wei = ethers.utils.parseEther(amount0.toString());
  const amount1Wei = ethers.utils.parseEther(amount1.toString());
  
  // 设置最小接受金额（这里设为0，实际应用中应该设置合理的值）
  const minAmount0 = 0;
  const minAmount1 = 0;
  
  // 设置截止时间（当前时间 + 1小时）
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  // 授权池合约使用代币
  await contracts.btk.approve(DEPLOYED_CONTRACTS.addresses.OnlyDexPool, amount0Wei);
  await contracts.mtk.approve(DEPLOYED_CONTRACTS.addresses.OnlyDexPool, amount1Wei);
  
  // 添加流动性
  const tx = await contracts.pool.addLiquidity(
    amount0Wei,
    amount1Wei,
    minAmount0,
    minAmount1,
    deadline
  );
  
  // 等待交易确认
  const receipt = await tx.wait();
  
  // 从事件中获取tokenId
  const addLiquidityEvent = receipt.events.find(event => event.event === 'AddLiquidity');
  const tokenId = addLiquidityEvent.args.tokenId;
  
  return tokenId;
}

// 交换代币：BTK -> MTK
async function swapBTKtoMTK(contracts, amountIn) {
  // 将ETH金额转换为Wei
  const amountInWei = ethers.utils.parseEther(amountIn.toString());
  
  // 设置最小输出金额（这里设为0，实际应用中应该设置合理的值）
  const minAmountOut = 0;
  
  // 设置截止时间（当前时间 + 1小时）
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  // 授权池合约使用代币
  await contracts.btk.approve(DEPLOYED_CONTRACTS.addresses.OnlyDexPool, amountInWei);
  
  // 执行交换
  const tx = await contracts.pool.swap0to1(amountInWei, minAmountOut, deadline);
  
  // 等待交易确认
  const receipt = await tx.wait();
  
  // 从事件中获取输出金额
  const swapEvent = receipt.events.find(event => event.event === 'Swap');
  const amountOut = swapEvent.args.amountOut;
  
  return ethers.utils.formatEther(amountOut);
}

// 主函数
async function main() {
  try {
    // 连接到以太坊
    const { signer, address } = await connectToEthereum();
    
    // 初始化合约
    const contracts = initializeContracts(signer);
    
    // 获取代币余额
    const balances = await getTokenBalances(contracts, address);
    console.log('Token balances:', balances);
    
    // 这里可以添加更多的交互逻辑
    // 例如：添加流动性、交换代币等
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// 当页面加载完成时执行main函数
window.addEventListener('load', main);

export {
  connectToEthereum,
  initializeContracts,
  getTokenBalances,
  addLiquidity,
  swapBTKtoMTK
};
