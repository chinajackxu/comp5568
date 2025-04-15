const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying OnlyDexPositionEnumerable contract...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 获取当前的OnlyDexAccess合约地址
  // 注意：请替换为您的实际地址
  const accessManagerAddress = "0x959F67a9089901400DbBBfca02f0561F90ED16dd";
  console.log("Using OnlyDexAccess at:", accessManagerAddress);

  // 部署OnlyDexPositionEnumerable合约
  const OnlyDexPositionEnumerable = await ethers.getContractFactory("OnlyDexPositionEnumerable");
  const positionContract = await OnlyDexPositionEnumerable.deploy(
    "OnlyDex Position", // 名称
    "ODPOS",           // 符号
    accessManagerAddress // 权限管理合约地址
  );

  await positionContract.deployed();
  console.log("OnlyDexPositionEnumerable deployed to:", positionContract.address);

  // 获取当前的OnlyDexPool合约地址
  // 注意：请替换为您的实际地址
  const poolAddress = "0xB63dC98770DE6c54fA844A4366a99311df79a22F";
  console.log("Authorizing pool at:", poolAddress);

  // 授权池合约
  const tx = await positionContract.setPoolAuthorization(poolAddress, true);
  await tx.wait();
  console.log("Pool authorized successfully");

  console.log("Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
