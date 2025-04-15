// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. 部署OnlyDexAccess合约
  const OnlyDexAccess = await ethers.getContractFactory("OnlyDexAccess");
  const accessManager = await OnlyDexAccess.deploy(deployer.address);
  await accessManager.waitForDeployment();
  const accessManagerAddress = await accessManager.getAddress();
  console.log("OnlyDexAccess deployed to:", accessManagerAddress);

  // 2. 部署OnlyDexFactory合约
  const OnlyDexFactory = await ethers.getContractFactory("OnlyDexFactory");
  const factory = await OnlyDexFactory.deploy(accessManagerAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("OnlyDexFactory deployed to:", factoryAddress);

  // 3. 部署测试代币
  const BasicToken = await ethers.getContractFactory("BasicToken");
  const basicToken = await BasicToken.deploy(ethers.parseEther("1000000"));
  await basicToken.waitForDeployment();
  const basicTokenAddress = await basicToken.getAddress();
  console.log("BasicToken (BTK) deployed to:", basicTokenAddress);

  const MintableToken = await ethers.getContractFactory("MintableToken");
  const mintableToken = await MintableToken.deploy(ethers.parseEther("1000000"));
  await mintableToken.waitForDeployment();
  const mintableTokenAddress = await mintableToken.getAddress();
  console.log("MintableToken (MTK) deployed to:", mintableTokenAddress);

  // 4. 创建交易池
  console.log("Creating pool for BTK/MTK...");
  const createPoolTx = await factory.createPool(basicTokenAddress, mintableTokenAddress);
  await createPoolTx.wait();

  // 获取池地址
  const poolAddress = await factory.getPool(basicTokenAddress, mintableTokenAddress);
  console.log("Pool created at:", poolAddress);

  // 5. 记录部署信息
  console.log("\nDeployment Summary:");
  console.log("--------------------------");
  console.log("OnlyDexAccess:", accessManagerAddress);
  console.log("OnlyDexFactory:", factoryAddress);
  console.log("BasicToken (BTK):", basicTokenAddress);
  console.log("MintableToken (MTK):", mintableTokenAddress);
  console.log("BTK/MTK Pool:", poolAddress);
  console.log("--------------------------");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
