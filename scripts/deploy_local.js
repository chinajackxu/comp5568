// 导入Hardhat运行环境
const hre = require("hardhat");

async function main() {
  // 获取部署账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("使用账户地址部署合约:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 初始代币供应量：1,000,000 tokens
  const initialSupply = 1000000;
  console.log(`初始代币供应量: ${initialSupply} tokens`);

  // 部署 BasicToken
  console.log("正在部署 BasicToken...");
  const BasicToken = await hre.ethers.getContractFactory("BasicToken");
  const basicToken = await BasicToken.deploy(initialSupply);
  await basicToken.waitForDeployment();
  const basicTokenAddress = await basicToken.getAddress();
  console.log(`BasicToken 部署成功，合约地址: ${basicTokenAddress}`);

  // 部署 MintableToken
  console.log("正在部署 MintableToken...");
  const MintableToken = await hre.ethers.getContractFactory("MintableToken");
  const mintableToken = await MintableToken.deploy(initialSupply);
  await mintableToken.waitForDeployment();
  const mintableTokenAddress = await mintableToken.getAddress();
  console.log(`MintableToken 部署成功，合约地址: ${mintableTokenAddress}`);

  // 打印部署信息摘要
  console.log("\n部署摘要:");
  console.log("----------------------------------------------------");
  console.log(`BasicToken (BTK): ${basicTokenAddress}`);
  console.log(`MintableToken (MTK): ${mintableTokenAddress}`);
  console.log("----------------------------------------------------");
}

// 运行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
