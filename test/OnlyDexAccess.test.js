const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OnlyDexAccess", function () {
  let OnlyDexAccess;
  let accessManager;
  let admin, user1, user2;
  
  beforeEach(async function () {
    // 获取测试账户
    [admin, user1, user2] = await ethers.getSigners();
    
    // 部署权限管理合约
    OnlyDexAccess = await ethers.getContractFactory("OnlyDexAccess");
    accessManager = await OnlyDexAccess.deploy(admin.address);
    await accessManager.waitForDeployment();
  });
  
  describe("初始设置", function () {
    it("管理员角色正确设置", async function () {
      expect(await accessManager.isAdmin(admin.address)).to.be.true;
      expect(await accessManager.isAdmin(user1.address)).to.be.false;
      expect(await accessManager.isAdmin(user2.address)).to.be.false;
    });
    
    it("管理员拥有DEFAULT_ADMIN_ROLE", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await accessManager.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });
    
    it("管理员拥有ADMIN_ROLE", async function () {
      const ADMIN_ROLE = await accessManager.ADMIN_ROLE();
      expect(await accessManager.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });
  });
  
  describe("角色管理", function () {
    it("管理员可以授予其他用户管理员角色", async function () {
      // 授予user1管理员角色
      await accessManager.grantAdminRole(user1.address);
      
      // 验证user1现在是管理员
      expect(await accessManager.isAdmin(user1.address)).to.be.true;
    });
    
    it("管理员可以撤销其他用户的管理员角色", async function () {
      // 先授予user1管理员角色
      await accessManager.grantAdminRole(user1.address);
      expect(await accessManager.isAdmin(user1.address)).to.be.true;
      
      // 撤销user1的管理员角色
      await accessManager.revokeAdminRole(user1.address);
      
      // 验证user1不再是管理员
      expect(await accessManager.isAdmin(user1.address)).to.be.false;
    });
    
    it("非默认管理员不能授予管理员角色", async function () {
      // 授予user1管理员角色但不授予DEFAULT_ADMIN_ROLE
      const ADMIN_ROLE = await accessManager.ADMIN_ROLE();
      await accessManager.grantRole(ADMIN_ROLE, user1.address);
      
      // 验证user1是管理员
      expect(await accessManager.isAdmin(user1.address)).to.be.true;
      
      // 但user1不能授予管理员角色给user2
      await expect(
        accessManager.connect(user1).grantAdminRole(user2.address)
      ).to.be.reverted;
    });
    
    it("DEFAULT_ADMIN_ROLE可以管理所有角色", async function () {
      // admin有DEFAULT_ADMIN_ROLE，可以授予和撤销任何角色
      const ADMIN_ROLE = await accessManager.ADMIN_ROLE();
      
      // 授予user1 ADMIN_ROLE
      await accessManager.grantRole(ADMIN_ROLE, user1.address);
      expect(await accessManager.hasRole(ADMIN_ROLE, user1.address)).to.be.true;
      
      // 撤销user1的ADMIN_ROLE
      await accessManager.revokeRole(ADMIN_ROLE, user1.address);
      expect(await accessManager.hasRole(ADMIN_ROLE, user1.address)).to.be.false;
    });
  });
  
  describe("安全检查", function () {
    it("管理员可以自我撤销角色（安全检查）", async function () {
      // 授予user1管理员角色和DEFAULT_ADMIN_ROLE
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      await accessManager.grantRole(DEFAULT_ADMIN_ROLE, user1.address);
      await accessManager.grantAdminRole(user1.address);
      
      // user1撤销自己的管理员角色
      await accessManager.connect(user1).revokeAdminRole(user1.address);
      
      // 验证user1不再是管理员
      expect(await accessManager.isAdmin(user1.address)).to.be.false;
    });
    
    it("角色授予和撤销会发出正确的事件", async function () {
      const ADMIN_ROLE = await accessManager.ADMIN_ROLE();
      
      // 检查grantRole事件
      await expect(
        accessManager.grantAdminRole(user1.address)
      )
        .to.emit(accessManager, "RoleGranted")
        .withArgs(ADMIN_ROLE, user1.address, admin.address);
      
      // 检查revokeRole事件
      await expect(
        accessManager.revokeAdminRole(user1.address)
      )
        .to.emit(accessManager, "RoleRevoked")
        .withArgs(ADMIN_ROLE, user1.address, admin.address);
    });
  });
}); 