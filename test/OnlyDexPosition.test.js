const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OnlyDexPosition", function () {
  let OnlyDexAccess, OnlyDexPosition;
  let accessManager, positionNFT;
  let admin, user1, user2;
  let token0Address, token1Address;

  beforeEach(async function () {
    // 获取测试账户
    [admin, user1, user2] = await ethers.getSigners();

    // 部署权限管理合约
    OnlyDexAccess = await ethers.getContractFactory("OnlyDexAccess");
    accessManager = await OnlyDexAccess.deploy(admin.address);
    await accessManager.waitForDeployment();

    // 部署NFT头寸合约
    OnlyDexPosition = await ethers.getContractFactory("OnlyDexPosition");
    positionNFT = await OnlyDexPosition.deploy(
      "OnlyDex Position", 
      "OLPOS", 
      await accessManager.getAddress(),
      ethers.ZeroAddress  // 添加第四个参数，表示没有初始池合约
    );
    await positionNFT.waitForDeployment();

    // 授权管理员地址为池合约，以便进行测试
    await positionNFT.setAuthorizedPoolForTest(admin.address);

    // 模拟代币地址
    token0Address = "0x0000000000000000000000000000000000000001";
    token1Address = "0x0000000000000000000000000000000000000002";
  });

  describe("基础功能测试", function () {
    it("初始化正确", async function () {
      expect(await positionNFT.name()).to.equal("OnlyDex Position");
      expect(await positionNFT.symbol()).to.equal("OLPOS");
    });

    it("管理员权限设置正确", async function () {
      expect(await positionNFT.accessManager()).to.equal(await accessManager.getAddress());
    });
  });

  describe("铸造和销毁功能", function () {
    it("管理员可以铸造NFT", async function () {
      // 管理员铸造NFT
      const tx = await positionNFT.mint(
        user1.address,
        token0Address,
        token1Address,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );

      const receipt = await tx.wait();
      
      // 验证NFT铸造成功
      expect(await positionNFT.balanceOf(user1.address)).to.equal(1);
      
      // 验证NFT的tokenId
      const tokenId = 1; // 第一个铸造的NFT的ID
      expect(await positionNFT.ownerOf(tokenId)).to.equal(user1.address);
      
      // 验证头寸信息正确
      const position = await positionNFT.getPositionInfo(tokenId);
      expect(position[0]).to.equal(token0Address); // token0
      expect(position[1]).to.equal(token1Address); // token1
      expect(position[2]).to.equal(ethers.parseEther("100")); // amount0
      expect(position[3]).to.equal(ethers.parseEther("200")); // amount1
      expect(position[4]).to.not.equal(0); // createdAt
    });

    it("非管理员不能铸造NFT", async function () {
      // 非管理员尝试铸造NFT
      await expect(
        positionNFT.connect(user1).mint(
          user1.address,
          token0Address,
          token1Address,
          ethers.parseEther("100"),
          ethers.parseEther("200")
        )
      ).to.be.revertedWith("OnlyDexPosition: not authorized pool");
    });

    it("管理员可以更新NFT头寸", async function () {
      // 先铸造NFT
      await positionNFT.mint(
        user1.address,
        token0Address,
        token1Address,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );
      
      const tokenId = 1;
      
      // 更新头寸
      await positionNFT.updatePosition(
        tokenId,
        ethers.parseEther("150"),
        ethers.parseEther("250")
      );
      
      // 验证头寸更新成功
      const position = await positionNFT.getPositionInfo(tokenId);
      expect(position[2]).to.equal(ethers.parseEther("150")); // amount0
      expect(position[3]).to.equal(ethers.parseEther("250")); // amount1
    });

    it("非管理员不能更新NFT头寸", async function () {
      // 先铸造NFT
      await positionNFT.mint(
        user1.address,
        token0Address,
        token1Address,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );
      
      const tokenId = 1;
      
      // 非管理员尝试更新头寸
      await expect(
        positionNFT.connect(user1).updatePosition(
          tokenId,
          ethers.parseEther("150"),
          ethers.parseEther("250")
        )
      ).to.be.revertedWith("OnlyDexPosition: not authorized pool");
    });

    it("管理员可以销毁NFT", async function () {
      // 先铸造NFT
      await positionNFT.mint(
        user1.address,
        token0Address,
        token1Address,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );
      
      const tokenId = 1;
      
      // 销毁NFT
      await positionNFT.burn(tokenId);
      
      // 验证NFT已销毁
      await expect(positionNFT.ownerOf(tokenId)).to.be.reverted;
    });

    it("非管理员不能销毁NFT", async function () {
      // 先铸造NFT
      await positionNFT.mint(
        user1.address,
        token0Address,
        token1Address,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );
      
      const tokenId = 1;
      
      // 非管理员尝试销毁NFT
      await expect(
        positionNFT.connect(user1).burn(tokenId)
      ).to.be.revertedWith("OnlyDexPosition: not authorized pool");
    });
  });

  describe("元数据功能", function () {
    it("可以设置和获取基础URI", async function () {
      // 设置基础URI
      await positionNFT.setBaseURI("https://onlydex.io/metadata/");
      
      // 铸造NFT
      await positionNFT.mint(
        user1.address,
        token0Address,
        token1Address,
        ethers.parseEther("100"),
        ethers.parseEther("200")
      );
      
      const tokenId = 1;
      
      // 验证tokenURI
      expect(await positionNFT.tokenURI(tokenId)).to.equal(`https://onlydex.io/metadata/${tokenId}`);
    });

    it("非管理员不能设置基础URI", async function () {
      // 非管理员尝试设置基础URI
      await expect(
        positionNFT.connect(user1).setBaseURI("https://onlydex.io/metadata/")
      ).to.be.revertedWith("OnlyDexPosition: not admin");
    });
  });

  describe("权限管理", function () {
    it("可以更新权限管理合约", async function () {
      // 部署新的权限管理合约
      const newAccessManager = await OnlyDexAccess.deploy(admin.address);
      await newAccessManager.waitForDeployment();
      
      // 更新权限管理合约
      await positionNFT.updateAccessManager(await newAccessManager.getAddress());
      
      // 验证更新成功
      expect(await positionNFT.accessManager()).to.equal(await newAccessManager.getAddress());
    });

    it("非管理员不能更新权限管理合约", async function () {
      // 部署新的权限管理合约
      const newAccessManager = await OnlyDexAccess.deploy(admin.address);
      await newAccessManager.waitForDeployment();
      
      // 非管理员尝试更新权限管理合约
      await expect(
        positionNFT.connect(user1).updateAccessManager(await newAccessManager.getAddress())
      ).to.be.revertedWith("OnlyDexPosition: not admin");
    });
  });
}); 