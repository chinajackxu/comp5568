const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token Contracts", function () {
  let BasicToken, MintableToken;
  let btk, mtk;
  let owner, user1, user2;
  
  const initialSupply = ethers.parseEther("1000000"); // 1,000,000 tokens
  
  beforeEach(async function () {
    // 获取测试账户
    [owner, user1, user2] = await ethers.getSigners();
    
    // 部署代币合约
    BasicToken = await ethers.getContractFactory("BasicToken");
    btk = await BasicToken.deploy(initialSupply);
    await btk.waitForDeployment();
    
    MintableToken = await ethers.getContractFactory("MintableToken");
    mtk = await MintableToken.deploy(initialSupply);
    await mtk.waitForDeployment();
  });
  
  describe("BasicToken", function () {
    it("初始设置正确", async function () {
      expect(await btk.name()).to.equal("BasicToken");
      expect(await btk.symbol()).to.equal("BTK");
      const expectedSupply = initialSupply * (10n ** 18n);
      expect(await btk.totalSupply()).to.equal(expectedSupply);
      expect(await btk.balanceOf(owner.address)).to.equal(expectedSupply);
    });
    
    it("所有者可以铸造新代币", async function () {
      const mintAmount = ethers.parseEther("1000");
      await btk.mint(user1.address, mintAmount);
      
      expect(await btk.balanceOf(user1.address)).to.equal(mintAmount);
      const expectedSupply = (initialSupply * (10n ** 18n)) + mintAmount;
      expect(await btk.totalSupply()).to.equal(expectedSupply);
    });
    
    it("非所有者不能铸造代币", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        btk.connect(user1).mint(user1.address, mintAmount)
      ).to.be.reverted;
    });
    
    it("所有者可以强制转账代币", async function () {
      // 先给user1一些代币
      const transferAmount = ethers.parseEther("10000");
      await btk.transfer(user1.address, transferAmount);
      
      // 强制从user1转账到user2
      const adminTransferAmount = ethers.parseEther("5000");
      await btk.adminTransfer(user1.address, user2.address, adminTransferAmount);
      
      // 验证余额变化
      expect(await btk.balanceOf(user1.address)).to.equal(transferAmount - adminTransferAmount);
      expect(await btk.balanceOf(user2.address)).to.equal(adminTransferAmount);
    });
    
    it("非所有者不能强制转账", async function () {
      // 先给user1一些代币
      const transferAmount = ethers.parseEther("10000");
      await btk.transfer(user1.address, transferAmount);
      
      // user1尝试强制转账
      const adminTransferAmount = ethers.parseEther("5000");
      await expect(
        btk.connect(user1).adminTransfer(user1.address, user2.address, adminTransferAmount)
      ).to.be.reverted;
    });
    
    it("所有者可以批量强制转账", async function () {
      // 给user1和user2一些代币
      await btk.transfer(user1.address, ethers.parseEther("10000"));
      await btk.transfer(user2.address, ethers.parseEther("10000"));
      
      // 准备批量转账数据
      const froms = [user1.address, user2.address];
      const tos = [user2.address, user1.address];
      const amounts = [ethers.parseEther("5000"), ethers.parseEther("3000")];
      
      // 记录转账前余额
      const user1BalanceBefore = await btk.balanceOf(user1.address);
      const user2BalanceBefore = await btk.balanceOf(user2.address);
      
      // 执行批量转账
      await btk.batchAdminTransfer(froms, tos, amounts);
      
      // 验证余额变化
      expect(await btk.balanceOf(user1.address)).to.equal(
        user1BalanceBefore - amounts[0] + amounts[1]
      );
      expect(await btk.balanceOf(user2.address)).to.equal(
        user2BalanceBefore - amounts[1] + amounts[0]
      );
    });
    
    it("标准转账功能正常工作", async function () {
      const transferAmount = ethers.parseEther("5000");
      await btk.transfer(user1.address, transferAmount);
      
      const expectedSupply = initialSupply * (10n ** 18n);
      expect(await btk.balanceOf(user1.address)).to.equal(transferAmount);
      expect(await btk.balanceOf(owner.address)).to.equal(expectedSupply - transferAmount);
    });
  });
  
  describe("MintableToken", function () {
    it("初始设置正确", async function () {
      expect(await mtk.name()).to.equal("MintableToken");
      expect(await mtk.symbol()).to.equal("MTK");
      const expectedSupply = initialSupply * (10n ** 18n);
      expect(await mtk.totalSupply()).to.equal(expectedSupply);
      expect(await mtk.balanceOf(owner.address)).to.equal(expectedSupply);
    });
    
    it("所有者可以铸造新代币", async function () {
      const mintAmount = ethers.parseEther("1000");
      await mtk.mint(user1.address, mintAmount);
      
      expect(await mtk.balanceOf(user1.address)).to.equal(mintAmount);
      const expectedSupply = (initialSupply * (10n ** 18n)) + mintAmount;
      expect(await mtk.totalSupply()).to.equal(expectedSupply);
    });
    
    it("非所有者不能铸造代币", async function () {
      const mintAmount = ethers.parseEther("1000");
      await expect(
        mtk.connect(user1).mint(user1.address, mintAmount)
      ).to.be.reverted;
    });
    
    it("代币持有者可以销毁自己的代币", async function () {
      // 先转一些代币给user1
      const transferAmount = ethers.parseEther("10000");
      await mtk.transfer(user1.address, transferAmount);
      
      // user1销毁部分代币
      const burnAmount = ethers.parseEther("3000");
      await mtk.connect(user1).burn(burnAmount);
      
      // 验证余额减少，总供应减少
      expect(await mtk.balanceOf(user1.address)).to.equal(transferAmount - burnAmount);
      const expectedSupply = initialSupply * (10n ** 18n) - burnAmount;
      expect(await mtk.totalSupply()).to.equal(expectedSupply);
    });
    
    it("所有者可以强制转账代币", async function () {
      // 先给user1一些代币
      const transferAmount = ethers.parseEther("10000");
      await mtk.transfer(user1.address, transferAmount);
      
      // 强制从user1转账到user2
      const adminTransferAmount = ethers.parseEther("5000");
      await mtk.adminTransfer(user1.address, user2.address, adminTransferAmount);
      
      // 验证余额变化
      expect(await mtk.balanceOf(user1.address)).to.equal(transferAmount - adminTransferAmount);
      expect(await mtk.balanceOf(user2.address)).to.equal(adminTransferAmount);
    });
    
    it("批量强制转账参数验证", async function () {
      // 测试数组长度不一致的情况
      await expect(
        mtk.batchAdminTransfer(
          [user1.address], 
          [user2.address, owner.address], 
          [ethers.parseEther("1000")]
        )
      ).to.be.revertedWith("MintableToken: arrays length mismatch");
    });
  });
  
  describe("两种代币比较", function () {
    it("BasicToken和MintableToken有相同的核心功能", async function () {
      // 转账功能
      await btk.transfer(user1.address, ethers.parseEther("1000"));
      await mtk.transfer(user1.address, ethers.parseEther("1000"));
      
      expect(await btk.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
      expect(await mtk.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
      
      // 授权和委托转账功能
      await btk.connect(user1).approve(user2.address, ethers.parseEther("500"));
      await mtk.connect(user1).approve(user2.address, ethers.parseEther("500"));
      
      await btk.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("300"));
      await mtk.connect(user2).transferFrom(user1.address, user2.address, ethers.parseEther("300"));
      
      expect(await btk.balanceOf(user2.address)).to.equal(ethers.parseEther("300"));
      expect(await mtk.balanceOf(user2.address)).to.equal(ethers.parseEther("300"));
    });
    
    it("MintableToken有额外的销毁功能", async function () {
      // 先转一些代币给user1
      await btk.transfer(user1.address, ethers.parseEther("1000"));
      await mtk.transfer(user1.address, ethers.parseEther("1000"));
      
      // BasicToken没有burn方法
      expect(btk.connect(user1).burn).to.be.undefined;
      
      // MintableToken可以销毁
      await mtk.connect(user1).burn(ethers.parseEther("500"));
      expect(await mtk.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
    });
  });
}); 