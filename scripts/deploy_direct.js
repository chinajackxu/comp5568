// 直接部署OnlyDex合约，不使用工厂合约
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("部署合约的账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // 部署权限管理合约
  console.log("部署OnlyDexAccess...");
  const OnlyDexAccess = await ethers.getContractFactory("OnlyDexAccess");
  const accessManager = await OnlyDexAccess.deploy(deployer.address);
  await accessManager.waitForDeployment();
  console.log("OnlyDexAccess部署地址:", await accessManager.getAddress());

  // 部署代币合约（用于测试）
  console.log("部署测试代币...");
  const initialSupply = ethers.parseEther("1000000"); // 1,000,000 tokens
  
  const BasicToken = await ethers.getContractFactory("BasicToken");
  const btk = await BasicToken.deploy(initialSupply);
  await btk.waitForDeployment();
  console.log("BasicToken部署地址:", await btk.getAddress());
  
  const MintableToken = await ethers.getContractFactory("MintableToken");
  const mtk = await MintableToken.deploy(initialSupply);
  await mtk.waitForDeployment();
  console.log("MintableToken部署地址:", await mtk.getAddress());

  // 直接部署交易池合约
  console.log("部署OnlyDexPool...");
  const OnlyDexPool = await ethers.getContractFactory("OnlyDexPool");
  const pool = await OnlyDexPool.deploy(
    await btk.getAddress(),
    await mtk.getAddress(),
    await accessManager.getAddress()
  );
  await pool.waitForDeployment();
  console.log("OnlyDexPool部署地址:", await pool.getAddress());

  // 获取NFT位置合约地址
  const positionNFTAddress = await pool.positionNFT();
  console.log("PositionNFT地址:", positionNFTAddress);

  // 将部署信息保存到文件中，方便测试使用
  const fs = require("fs");
  const deploymentInfo = {
    accessManager: await accessManager.getAddress(),
    btk: await btk.getAddress(),
    mtk: await mtk.getAddress(),
    pool: await pool.getAddress(),
    positionNFT: positionNFTAddress
  };
  
  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("部署信息已保存到deployment.json");

  console.log("部署完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
