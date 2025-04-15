// 直接部署OnlyDex合约到Sepolia测试网，不使用工厂合约
const { ethers, run, network } = require("hardhat");
const fs = require("fs");

async function main() {
  // 检查网络
  if (network.name !== "sepolia") {
    console.warn("警告: 此脚本设计用于Sepolia测试网。当前网络:", network.name);
  }

  const [deployer] = await ethers.getSigners();
  console.log("部署合约的账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 部署权限管理合约
  console.log("\n部署OnlyDexAccess...");
  const OnlyDexAccess = await ethers.getContractFactory("OnlyDexAccess");
  const accessManager = await OnlyDexAccess.deploy(deployer.address);
  await accessManager.waitForDeployment();
  const accessManagerAddress = await accessManager.getAddress();
  console.log("OnlyDexAccess部署地址:", accessManagerAddress);

  // 部署代币合约
  console.log("\n部署代币合约...");
  const initialSupply = ethers.parseEther("1000000"); // 1,000,000 tokens
  
  const BasicToken = await ethers.getContractFactory("BasicToken");
  const btk = await BasicToken.deploy(initialSupply);
  await btk.waitForDeployment();
  const btkAddress = await btk.getAddress();
  console.log("BasicToken部署地址:", btkAddress);
  
  const MintableToken = await ethers.getContractFactory("MintableToken");
  const mtk = await MintableToken.deploy(initialSupply);
  await mtk.waitForDeployment();
  const mtkAddress = await mtk.getAddress();
  console.log("MintableToken部署地址:", mtkAddress);

  // 直接部署交易池合约
  console.log("\n部署OnlyDexPool...");
  const OnlyDexPool = await ethers.getContractFactory("OnlyDexPool");
  const pool = await OnlyDexPool.deploy(
    btkAddress,
    mtkAddress,
    accessManagerAddress
  );
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("OnlyDexPool部署地址:", poolAddress);

  // 获取NFT位置合约地址
  const positionNFTAddress = await pool.positionNFT();
  console.log("PositionNFT地址:", positionNFTAddress);

  // 打印部署信息摘要
  console.log("\n部署摘要:");
  console.log("----------------------------------------------------");
  console.log(`OnlyDexAccess: ${accessManagerAddress}`);
  console.log(`BasicToken (BTK): ${btkAddress}`);
  console.log(`MintableToken (MTK): ${mtkAddress}`);
  console.log(`OnlyDexPool: ${poolAddress}`);
  console.log(`PositionNFT: ${positionNFTAddress}`);
  console.log("----------------------------------------------------");

  // 等待区块确认
  console.log("\n等待区块确认...");
  
  console.log("等待 5 个区块确认...");
  await accessManager.deploymentTransaction().wait(5);
  console.log("OnlyDexAccess 已确认");
  
  await btk.deploymentTransaction().wait(5);
  console.log("BasicToken 已确认");
  
  await mtk.deploymentTransaction().wait(5);
  console.log("MintableToken 已确认");
  
  await pool.deploymentTransaction().wait(5);
  console.log("OnlyDexPool 已确认");

  // 将部署信息保存到文件中
  const deploymentInfo = {
    network: network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    addresses: {
      OnlyDexAccess: accessManagerAddress,
      BasicToken: btkAddress,
      MintableToken: mtkAddress,
      Pool: poolAddress,
      PositionNFT: positionNFTAddress
    },
    tokens: {
      BTK: {
        address: btkAddress,
        name: "BasicToken",
        symbol: "BTK",
        decimals: 18
      },
      MTK: {
        address: mtkAddress,
        name: "MintableToken",
        symbol: "MTK",
        decimals: 18
      }
    }
  };
  
  // 保存到文件
  const deploymentFileName = `deployment-${network.name}-${new Date().toISOString().replace(/:/g, '-')}.json`;
  fs.writeFileSync(deploymentFileName, JSON.stringify(deploymentInfo, null, 2));
  console.log(`部署信息已保存到 ${deploymentFileName}`);

  // 更新前端配置
  try {
    const frontendDeploymentPath = "new-frontend/src/deployed-contracts.js";
    const frontendDeploymentContent = `/**
 * OnlyDex - 已部署合约地址
 * 网络: ${network.name}
 * 部署时间: ${new Date().toISOString()}
 * 部署账户: ${deployer.address}
 */

const DEPLOYED_CONTRACTS = {
  // 合约地址
  addresses: {
    OnlyDexAccess: '${accessManagerAddress}',
    BasicToken: '${btkAddress}',
    MintableToken: '${mtkAddress}',
    Pool: '${poolAddress}'
  },
  
  // 网络信息
  network: {
    name: '${network.name}',
    chainId: ${network.config.chainId},
    rpcUrl: '${network.config.url || "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"}'
  },
  
  // 代币信息
  tokens: {
    BTK: {
      address: '${btkAddress}',
      name: 'BasicToken',
      symbol: 'BTK',
      decimals: 18
    },
    MTK: {
      address: '${mtkAddress}',
      name: 'MintableToken',
      symbol: 'MTK',
      decimals: 18
    }
  }
};

export default DEPLOYED_CONTRACTS; 
`;
    fs.writeFileSync(frontendDeploymentPath, frontendDeploymentContent);
    console.log(`前端配置已更新: ${frontendDeploymentPath}`);
  } catch (error) {
    console.warn("无法更新前端配置:", error.message);
  }

  // 验证合约（如果配置了Etherscan API密钥）
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n开始验证合约...");
    
    try {
      console.log("验证 OnlyDexAccess...");
      await run("verify:verify", {
        address: accessManagerAddress,
        constructorArguments: [deployer.address],
      });
    } catch (error) {
      console.error("验证OnlyDexAccess失败:", error.message);
    }
    
    try {
      console.log("验证 BasicToken...");
      await run("verify:verify", {
        address: btkAddress,
        constructorArguments: [initialSupply],
      });
    } catch (error) {
      console.error("验证BasicToken失败:", error.message);
    }
    
    try {
      console.log("验证 MintableToken...");
      await run("verify:verify", {
        address: mtkAddress,
        constructorArguments: [initialSupply],
      });
    } catch (error) {
      console.error("验证MintableToken失败:", error.message);
    }
    
    try {
      console.log("验证 OnlyDexPool...");
      await run("verify:verify", {
        address: poolAddress,
        constructorArguments: [btkAddress, mtkAddress, accessManagerAddress],
      });
    } catch (error) {
      console.error("验证OnlyDexPool失败:", error.message);
    }
    
    console.log("合约验证完成！");
  } else {
    console.log("\n未配置Etherscan API密钥，跳过合约验证");
    console.log("如需验证合约，请在.env文件中设置ETHERSCAN_API_KEY");
  }

  console.log("\n部署完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
