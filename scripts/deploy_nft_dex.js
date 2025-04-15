// 导入Hardhat运行环境
const hre = require("hardhat");

async function main() {
  // 获取部署账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("使用账户地址部署合约:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 部署 BasicToken
  console.log("正在部署 BasicToken...");
  const BasicToken = await hre.ethers.getContractFactory("BasicToken");
  const basicToken = await BasicToken.deploy(1000000); // 初始供应量：1,000,000
  await basicToken.waitForDeployment();
  const basicTokenAddress = await basicToken.getAddress();
  console.log(`BasicToken 部署成功，合约地址: ${basicTokenAddress}`);

  // 部署 MintableToken
  console.log("正在部署 MintableToken...");
  const MintableToken = await hre.ethers.getContractFactory("MintableToken");
  const mintableToken = await MintableToken.deploy(1000000); // 初始供应量：1,000,000
  await mintableToken.waitForDeployment();
  const mintableTokenAddress = await mintableToken.getAddress();
  console.log(`MintableToken 部署成功，合约地址: ${mintableTokenAddress}`);

  // 部署 OnlyDexFactory
  console.log("正在部署 OnlyDexFactory...");
  const OnlyDexFactory = await hre.ethers.getContractFactory("OnlyDexFactory");
  const factory = await OnlyDexFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`OnlyDexFactory 部署成功，合约地址: ${factoryAddress}`);

  // 使用工厂创建交易池
  console.log("正在创建交易池...");
  const createPoolTx = await factory.createPool(basicTokenAddress, mintableTokenAddress);
  await createPoolTx.wait();
  
  // 获取池地址
  const poolAddress = await factory.getPool(basicTokenAddress, mintableTokenAddress);
  console.log(`交易池创建成功，合约地址: ${poolAddress}`);

  // 获取NFT头寸合约地址
  const OnlyDexPool = await hre.ethers.getContractFactory("OnlyDexPool");
  const pool = OnlyDexPool.attach(poolAddress);
  const positionNFTAddress = await pool.positionNFT();
  console.log(`NFT头寸合约地址: ${positionNFTAddress}`);

  // 打印部署信息摘要
  console.log("\n部署摘要:");
  console.log("----------------------------------------------------");
  console.log(`BasicToken (BTK): ${basicTokenAddress}`);
  console.log(`MintableToken (MTK): ${mintableTokenAddress}`);
  console.log(`OnlyDexFactory: ${factoryAddress}`);
  console.log(`OnlyDexPool: ${poolAddress}`);
  console.log(`OnlyDexPosition (NFT): ${positionNFTAddress}`);
  console.log("----------------------------------------------------");
  
  console.log("\n使用说明:");
  console.log("1. 添加流动性并获得NFT头寸:");
  console.log(`   - 批准池合约使用您的代币: approve(${poolAddress}, amount)`);
  console.log("   - 调用addLiquidity(amount0, amount1)添加流动性");
  console.log("   - 您将收到一个NFT代表您的流动性份额");
  
  console.log("\n2. 增加现有头寸的流动性:");
  console.log("   - 批准池合约使用您的代币");
  console.log("   - 调用increaseLiquidity(tokenId, amount0, amount1)");
  
  console.log("\n3. 减少头寸的流动性:");
  console.log("   - 调用decreaseLiquidity(tokenId, amount0, amount1)");
  
  console.log("\n4. 移除全部流动性并销毁NFT:");
  console.log("   - 调用removeLiquidity(tokenId)");
  
  console.log("\n5. 转让流动性份额:");
  console.log("   - 直接转让NFT: transferFrom(from, to, tokenId)");
}

// 运行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
