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
  console.log("正在部署 BasicToken 到 Sepolia 测试网...");
  const BasicToken = await hre.ethers.getContractFactory("BasicToken");
  const basicToken = await BasicToken.deploy(initialSupply);
  await basicToken.waitForDeployment();
  const basicTokenAddress = await basicToken.getAddress();
  console.log(`BasicToken 部署成功，合约地址: ${basicTokenAddress}`);

  // 部署 MintableToken
  console.log("正在部署 MintableToken 到 Sepolia 测试网...");
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
  
  console.log("\n等待区块确认...");
  
  // 等待几个区块确认
  console.log("等待 5 个区块确认...");
  await basicToken.deploymentTransaction().wait(5);
  console.log("BasicToken 已确认");
  
  await mintableToken.deploymentTransaction().wait(5);
  console.log("MintableToken 已确认");
  
  // 验证合约（如果配置了Etherscan API密钥）
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n开始验证合约...");
    
    console.log("验证 BasicToken...");
    await hre.run("verify:verify", {
      address: basicTokenAddress,
      constructorArguments: [initialSupply],
    });
    
    console.log("验证 MintableToken...");
    await hre.run("verify:verify", {
      address: mintableTokenAddress,
      constructorArguments: [initialSupply],
    });
    
    console.log("合约验证完成！");
  } else {
    console.log("\n未配置Etherscan API密钥，跳过合约验证");
    console.log("如需验证合约，请在.env文件中设置ETHERSCAN_API_KEY");
  }
}

// 运行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
