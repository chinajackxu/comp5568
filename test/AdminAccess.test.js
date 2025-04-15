const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("管理员权限测试", function () {
  let accessManager, pool, btk, mtk;
  let admin, user1, user2;

  // 测试常量
  const initialTokenSupply = ethers.parseEther("1000000"); // 1,000,000 tokens

  beforeEach(async function () {
    // 获取测试账户
    [admin, user1, user2] = await ethers.getSigners();

    // 部署权限管理合约
    const OnlyDexAccess = await ethers.getContractFactory("OnlyDexAccess");
    accessManager = await OnlyDexAccess.deploy(admin.address);
    await accessManager.waitForDeployment();

    // 部署代币合约
    const BasicToken = await ethers.getContractFactory("BasicToken");
    btk = await BasicToken.deploy(initialTokenSupply);
    await btk.waitForDeployment();

    const MintableToken = await ethers.getContractFactory("MintableToken");
    mtk = await MintableToken.deploy(initialTokenSupply);
    await mtk.waitForDeployment();

    // 部署交易池合约
    const OnlyDexPool = await ethers.getContractFactory("OnlyDexPool");
    pool = await OnlyDexPool.deploy(
      await btk.getAddress(),
      await mtk.getAddress(),
      await accessManager.getAddress()
    );
    await pool.waitForDeployment();
  });

  describe("权限管理基础功能", function () {
    it("初始管理员应该正确设置", async function () {
      expect(await accessManager.isAdmin(admin.address)).to.be.true;
      expect(await accessManager.isAdmin(user1.address)).to.be.false;
      expect(await accessManager.isAdmin(user2.address)).to.be.false;
    });

    it("管理员可以授予其他用户管理员权限", async function () {
      await accessManager.connect(admin).grantAdminRole(user1.address);
      expect(await accessManager.isAdmin(user1.address)).to.be.true;
    });

    it("管理员可以撤销其他用户的管理员权限", async function () {
      // 先授予权限
      await accessManager.connect(admin).grantAdminRole(user1.address);
      expect(await accessManager.isAdmin(user1.address)).to.be.true;

      // 然后撤销权限
      await accessManager.connect(admin).revokeAdminRole(user1.address);
      expect(await accessManager.isAdmin(user1.address)).to.be.false;
    });

    it("非管理员不能授予管理员权限", async function () {
      await expect(
        accessManager.connect(user1).grantAdminRole(user2.address)
      ).to.be.reverted;
    });

    it("非管理员不能撤销管理员权限", async function () {
      await expect(
        accessManager.connect(user1).revokeAdminRole(admin.address)
      ).to.be.reverted;
    });
  });

  describe("与交易池合约的集成", function () {
    it("只有管理员可以设置交易费率", async function () {
      const newFee = 10; // 0.1%

      // 管理员可以设置
      await pool.connect(admin).setSwapFee(newFee);
      expect(await pool.swapFee()).to.equal(newFee);

      // 非管理员不能设置
      await expect(
        pool.connect(user1).setSwapFee(20)
      ).to.be.revertedWith("OnlyDexPool: caller is not admin");
    });

    it("只有管理员可以暂停池操作", async function () {
      // 管理员可以暂停
      await pool.connect(admin).setPaused(true);
      expect(await pool.paused()).to.be.true;

      // 非管理员不能暂停
      await pool.connect(admin).setPaused(false); // 先恢复
      await expect(
        pool.connect(user1).setPaused(true)
      ).to.be.revertedWith("OnlyDexPool: caller is not admin");
    });

    it("只有管理员可以设置最大价格偏离参数", async function () {
      const newDeviation = 30; // 3%

      // 管理员可以设置
      await pool.connect(admin).setMaxPriceDeviation(newDeviation);
      expect(await pool.maxPriceDeviation()).to.equal(newDeviation);

      // 非管理员不能设置
      await expect(
        pool.connect(user1).setMaxPriceDeviation(40)
      ).to.be.revertedWith("OnlyDexPool: caller is not admin");
    });
  });

  describe("权限转移场景", function () {
    it("管理员权限可以转移给新用户", async function () {
      // 授予user1管理员权限
      await accessManager.connect(admin).grantAdminRole(user1.address);
      expect(await accessManager.isAdmin(user1.address)).to.be.true;

      // user1现在可以执行管理员操作
      const newFee = 15; // 0.15%
      await pool.connect(user1).setSwapFee(newFee);
      expect(await pool.swapFee()).to.equal(newFee);
    });

    it("撤销管理员权限后不能执行管理员操作", async function () {
      // 授予user1管理员权限
      await accessManager.connect(admin).grantAdminRole(user1.address);
      expect(await accessManager.isAdmin(user1.address)).to.be.true;

      // user1可以执行管理员操作
      await pool.connect(user1).setSwapFee(15);

      // 撤销user1的管理员权限
      await accessManager.connect(admin).revokeAdminRole(user1.address);
      expect(await accessManager.isAdmin(user1.address)).to.be.false;

      // user1不能再执行管理员操作
      await expect(
        pool.connect(user1).setSwapFee(20)
      ).to.be.revertedWith("OnlyDexPool: caller is not admin");
    });
  });

  describe("前端权限检查模拟", function () {
    it("模拟前端isAdmin调用", async function () {
      // 这个测试模拟前端如何检查管理员权限

      // 检查admin账户
      const adminStatus = await accessManager.isAdmin(admin.address);
      expect(adminStatus).to.be.true;

      // 检查普通用户账户
      const userStatus = await accessManager.isAdmin(user1.address);
      expect(userStatus).to.be.false;

      // 授予权限后再次检查
      await accessManager.connect(admin).grantAdminRole(user1.address);
      const newUserStatus = await accessManager.isAdmin(user1.address);
      expect(newUserStatus).to.be.true;
    });

    it("模拟前端权限变更后的状态更新", async function () {
      // 初始状态
      let user1IsAdmin = await accessManager.isAdmin(user1.address);
      expect(user1IsAdmin).to.be.false;

      // 授予权限
      await accessManager.connect(admin).grantAdminRole(user1.address);

      // 检查更新后的状态
      user1IsAdmin = await accessManager.isAdmin(user1.address);
      expect(user1IsAdmin).to.be.true;

      // 撤销权限
      await accessManager.connect(admin).revokeAdminRole(user1.address);

      // 再次检查状态
      user1IsAdmin = await accessManager.isAdmin(user1.address);
      expect(user1IsAdmin).to.be.false;
    });
  });
});
