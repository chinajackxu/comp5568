import { ethers } from 'ethers';

// 调试函数：检查汇率计算
export const debugRateCalculation = async (poolContract) => {
  try {
    // 获取池中的余额
    const [balance0, balance1] = await poolContract.getBalances();
    console.log('池中的余额:');
    console.log('balance0 (BTK):', ethers.utils.formatUnits(balance0, 18));
    console.log('balance1 (MTK):', ethers.utils.formatUnits(balance1, 18));

    // 获取当前汇率
    const rate = await poolContract.getRate();
    console.log('合约返回的汇率:', ethers.utils.formatUnits(rate, 18));

    // 获取交易费率
    const swapFee = await poolContract.swapFee();
    console.log('交易费率:', swapFee.toString(), '基点 (', swapFee.toNumber() / 100, '%)');

    // 在恒定乘积模型中，汇率就是余额比例
    // 计算扣除手续费前的理论汇率
    const rawRate = balance1.mul(ethers.utils.parseUnits('1', 18)).div(balance0);
    console.log('原始理论汇率（基于池子余额）:', ethers.utils.formatUnits(rawRate, 18));

    // 计算扣除手续费后的理论汇率
    const feeAdjustedRate = rawRate.mul(10000 - swapFee).div(10000);
    console.log('扣除手续费后的理论汇率:', ethers.utils.formatUnits(feeAdjustedRate, 18));

    return {
      balance0: ethers.utils.formatUnits(balance0, 18),
      balance1: ethers.utils.formatUnits(balance1, 18),
      rate: ethers.utils.formatUnits(rate, 18),
      rawRate: ethers.utils.formatUnits(rawRate, 18),
      feeAdjustedRate: ethers.utils.formatUnits(feeAdjustedRate, 18),
      swapFee: swapFee.toString()
    };
  } catch (error) {
    console.error('调试汇率计算时出错:', error);
    throw error;
  }
};
