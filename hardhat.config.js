require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// 这是一个示例Hardhat任务，用于打印账户列表
task("accounts", "打印账户列表", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      },
      viaIR: true
    }
  },
  networks: {
    // 本地Hardhat网络配置
    hardhat: {
      chainId: 31337
    },
    // Sepolia测试网配置（只有在环境变量正确设置时才会加载）
    ...(process.env.SEPOLIA_URL && process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length >= 64 ? {
      sepolia: {
        url: process.env.SEPOLIA_URL,
        accounts: [process.env.PRIVATE_KEY]
      }
    } : {})
  },
  ...(process.env.ETHERSCAN_API_KEY ? {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY
    }
  } : {})
};
