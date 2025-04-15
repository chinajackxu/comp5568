const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("代币合约测试", function () {
  let basicToken;
  let mintableToken;
  let owner;
  let user1;
  let user2;
  const initialSupply = 1000000; // 初始供应量：1,000,000 tokens

  beforeEach(async function () {
    // 获取测试账户
    [owner, user1, user2] = await ethers.getSigners();

    // 部署 BasicToken
    const BasicToken = await ethers.getContractFactory("BasicToken");
    basicToken = await BasicToken.deploy(initialSupply);
    await basicToken.waitForDeployment();

    // 部署 MintableToken
    const MintableToken = await ethers.getContractFactory("MintableToken");
    mintableToken = await MintableToken.deploy(initialSupply);
    await mintableToken.waitForDeployment();
  });

  describe("BasicToken 测试", function () {
    it("应该正确设置初始供应量和代币名称", async function () {
      const name = await basicToken.name();
      const symbol = await basicToken.symbol();
      const totalSupply = await basicToken.totalSupply();
      const ownerBalance = await basicToken.balanceOf(owner.address);
      const expectedSupply = ethers.parseEther(initialSupply.toString());

      expect(name).to.equal("BasicToken");
      expect(symbol).to.equal("BTK");
      expect(totalSupply).to.equal(expectedSupply); // 使用parseEther处理大数值
      expect(ownerBalance).to.equal(totalSupply);
    });

    it("管理员应该能够铸造新代币", async function () {
      const mintAmount = ethers.parseEther("1000"); // 铸造1000个代币
      const initialTotalSupply = await basicToken.totalSupply();
      const initialUser1Balance = await basicToken.balanceOf(user1.address);

      // 铸造代币给user1
      await basicToken.mint(user1.address, mintAmount);

      // 检查余额变化
      const newTotalSupply = await basicToken.totalSupply();
      const newUser1Balance = await basicToken.balanceOf(user1.address);

      expect(newTotalSupply).to.equal(initialTotalSupply + mintAmount);
      expect(newUser1Balance).to.equal(initialUser1Balance + mintAmount);
    });

    it("管理员应该能够强制转账代币", async function () {
      // 先给user1一些代币
      const transferAmount = ethers.parseEther("500"); // 500个代币
      await basicToken.transfer(user1.address, transferAmount);

      // 检查初始余额
      const initialUser1Balance = await basicToken.balanceOf(user1.address);
      const initialUser2Balance = await basicToken.balanceOf(user2.address);

      // 管理员强制从user1转账到user2
      const forceTransferAmount = ethers.parseEther("200"); // 200个代币
      await basicToken.adminTransfer(user1.address, user2.address, forceTransferAmount);

      // 检查余额变化
      const newUser1Balance = await basicToken.balanceOf(user1.address);
      const newUser2Balance = await basicToken.balanceOf(user2.address);

      expect(newUser1Balance).to.equal(initialUser1Balance - forceTransferAmount);
      expect(newUser2Balance).to.equal(initialUser2Balance + forceTransferAmount);
    });

    it("批量管理员转账应该正常工作", async function () {
      // 先给user1一些代币
      const transferAmount = ethers.parseEther("1000"); // 1000个代币
      await basicToken.transfer(user1.address, transferAmount);

      // 检查初始余额
      const initialOwnerBalance = await basicToken.balanceOf(owner.address);
      const initialUser1Balance = await basicToken.balanceOf(user1.address);
      const initialUser2Balance = await basicToken.balanceOf(user2.address);

      // 准备批量转账数据
      const froms = [owner.address, user1.address];
      const tos = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];

      // 执行批量转账
      await basicToken.batchAdminTransfer(froms, tos, amounts);

      // 检查余额变化
      const newOwnerBalance = await basicToken.balanceOf(owner.address);
      const newUser1Balance = await basicToken.balanceOf(user1.address);
      const newUser2Balance = await basicToken.balanceOf(user2.address);

      expect(newOwnerBalance).to.equal(initialOwnerBalance - amounts[0]);
      expect(newUser1Balance).to.equal(initialUser1Balance + amounts[0] - amounts[1]);
      expect(newUser2Balance).to.equal(initialUser2Balance + amounts[1]);
    });
  });

  describe("MintableToken 测试", function () {
    it("应该正确设置初始供应量和代币名称", async function () {
      const name = await mintableToken.name();
      const symbol = await mintableToken.symbol();
      const totalSupply = await mintableToken.totalSupply();
      const ownerBalance = await mintableToken.balanceOf(owner.address);
      const expectedSupply = ethers.parseEther(initialSupply.toString());

      expect(name).to.equal("MintableToken");
      expect(symbol).to.equal("MTK");
      expect(totalSupply).to.equal(expectedSupply); // 使用parseEther处理大数值
      expect(ownerBalance).to.equal(totalSupply);
    });

    it("管理员应该能够铸造新代币", async function () {
      const mintAmount = ethers.parseEther("1000"); // 铸造1000个代币
      const initialTotalSupply = await mintableToken.totalSupply();
      const initialUser1Balance = await mintableToken.balanceOf(user1.address);

      // 铸造代币给user1
      await mintableToken.mint(user1.address, mintAmount);

      // 检查余额变化
      const newTotalSupply = await mintableToken.totalSupply();
      const newUser1Balance = await mintableToken.balanceOf(user1.address);

      expect(newTotalSupply).to.equal(initialTotalSupply + mintAmount);
      expect(newUser1Balance).to.equal(initialUser1Balance + mintAmount);
    });

    it("管理员应该能够强制转账代币", async function () {
      // 先给user1一些代币
      const transferAmount = ethers.parseEther("500"); // 500个代币
      await mintableToken.transfer(user1.address, transferAmount);

      // 检查初始余额
      const initialUser1Balance = await mintableToken.balanceOf(user1.address);
      const initialUser2Balance = await mintableToken.balanceOf(user2.address);

      // 管理员强制从user1转账到user2
      const forceTransferAmount = ethers.parseEther("200"); // 200个代币
      await mintableToken.adminTransfer(user1.address, user2.address, forceTransferAmount);

      // 检查余额变化
      const newUser1Balance = await mintableToken.balanceOf(user1.address);
      const newUser2Balance = await mintableToken.balanceOf(user2.address);

      expect(newUser1Balance).to.equal(initialUser1Balance - forceTransferAmount);
      expect(newUser2Balance).to.equal(initialUser2Balance + forceTransferAmount);
    });

    it("用户应该能够销毁自己的代币", async function () {
      // 先给user1一些代币
      const transferAmount = ethers.parseEther("500"); // 500个代币
      await mintableToken.transfer(user1.address, transferAmount);

      // 检查初始余额和总供应量
      const initialUser1Balance = await mintableToken.balanceOf(user1.address);
      const initialTotalSupply = await mintableToken.totalSupply();

      // user1销毁自己的一部分代币
      const burnAmount = ethers.parseEther("100"); // 销毁100个代币
      await mintableToken.connect(user1).burn(burnAmount);

      // 检查余额和总供应量变化
      const newUser1Balance = await mintableToken.balanceOf(user1.address);
      const newTotalSupply = await mintableToken.totalSupply();

      expect(newUser1Balance).to.equal(initialUser1Balance - burnAmount);
      expect(newTotalSupply).to.equal(initialTotalSupply - burnAmount);
    });
  });
});
