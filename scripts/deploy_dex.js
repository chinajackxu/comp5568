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

  // 打印部署信息摘要
  console.log("\n部署摘要:");
  console.log("----------------------------------------------------");
  console.log(`BasicToken (BTK): ${basicTokenAddress}`);
  console.log(`MintableToken (MTK): ${mintableTokenAddress}`);
  console.log(`OnlyDexFactory: ${factoryAddress}`);
  console.log(`OnlyDexPool: ${poolAddress}`);
  console.log("----------------------------------------------------");
  
  console.log("\n下一步操作:");
  console.log("1. 向交易池添加流动性");
  console.log("2. 测试代币交换功能");
  console.log("3. 调整曲线参数（如需要）");
}

// 运行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
