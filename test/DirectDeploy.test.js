const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OnlyDex直接部署测试", function () {
  let accessManager, btk, mtk, pool, positionNFT;
  let admin, user1, user2;

  // 测试常量
  const initialTokenSupply = ethers.parseEther("1000000"); // 1,000,000 tokens
  const initialLiquidity = ethers.parseEther("10000"); // 10,000 tokens for initial liquidity
  const swapAmount = ethers.parseEther("100"); // 100 tokens for swap tests

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

    // 为用户转账代币
    await btk.transfer(user1.address, ethers.parseEther("50000"));
    await mtk.transfer(user1.address, ethers.parseEther("50000"));
    await btk.transfer(user2.address, ethers.parseEther("50000"));
    await mtk.transfer(user2.address, ethers.parseEther("50000"));

    // 直接部署交易池合约
    const OnlyDexPool = await ethers.getContractFactory("OnlyDexPool");
    pool = await OnlyDexPool.deploy(
      await btk.getAddress(),
      await mtk.getAddress(),
      await accessManager.getAddress()
    );
    await pool.waitForDeployment();

    // 获取NFT位置合约地址
    const positionNFTAddress = await pool.positionNFT();
    const OnlyDexPosition = await ethers.getContractFactory("OnlyDexPosition");
    positionNFT = OnlyDexPosition.attach(positionNFTAddress);

    // 授权代币给池合约
    const poolAddress = await pool.getAddress();
    await btk.connect(user1).approve(poolAddress, ethers.parseEther("1000000"));
    await mtk.connect(user1).approve(poolAddress, ethers.parseEther("1000000"));
    await btk.connect(user2).approve(poolAddress, ethers.parseEther("1000000"));
    await mtk.connect(user2).approve(poolAddress, ethers.parseEther("1000000"));
    await btk.connect(admin).approve(poolAddress, ethers.parseEther("1000000"));
    await mtk.connect(admin).approve(poolAddress, ethers.parseEther("1000000"));
  });

  describe("初始设置", function () {
    it("交易池正确设置代币", async function () {
      expect(await pool.token0()).to.equal(await btk.getAddress());
      expect(await pool.token1()).to.equal(await mtk.getAddress());
    });

    it("交易池创建NFT位置合约", async function () {
      expect(await pool.positionNFT()).to.equal(await positionNFT.getAddress());
      expect(await positionNFT.getAddress()).to.not.equal(ethers.ZeroAddress);

      // 验证NFT合约设置
      expect(await positionNFT.name()).to.equal("OnlyDex Position");
      expect(await positionNFT.symbol()).to.equal("OLPOS");
    });

    it("初始参数设置正确", async function () {
      expect(await pool.A()).to.equal(50); // 放大系数默认为50
      expect(await pool.swapFee()).to.equal(4); // 交易费率默认为0.04%
      expect(await pool.paused()).to.be.false; // 默认不暂停
    });
  });

  describe("流动性管理", function () {
    it("用户可以添加流动性并铸造NFT", async function () {
      // 记录添加流动性前的余额
      const user1BtkBefore = await btk.balanceOf(user1.address);
      const user1MtkBefore = await mtk.balanceOf(user1.address);

      // 添加流动性
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      const tx = await pool.connect(user1).addLiquidity(initialLiquidity, initialLiquidity, 0, 0, deadline);
      const receipt = await tx.wait();

      // 验证用户代币减少
      expect(await btk.balanceOf(user1.address)).to.equal(user1BtkBefore - initialLiquidity);
      expect(await mtk.balanceOf(user1.address)).to.equal(user1MtkBefore - initialLiquidity);

      // 验证池余额增加
      const [balance0, balance1] = await pool.getBalances();
      expect(balance0).to.equal(initialLiquidity);
      expect(balance1).to.equal(initialLiquidity);

      // 验证NFT铸造
      const addLiquidityEvent = receipt.logs.find(log =>
        log.fragment && log.fragment.name === 'AddLiquidity'
      );
      expect(addLiquidityEvent).to.not.be.undefined;

      const tokenId = addLiquidityEvent.args[1]; // tokenId
      expect(await positionNFT.ownerOf(tokenId)).to.equal(user1.address);

      // 验证头寸信息
      const [posToken0, posToken1, amount0, amount1] = await pool.getPositionInfo(tokenId);
      expect(posToken0).to.equal(await btk.getAddress());
      expect(posToken1).to.equal(await mtk.getAddress());
      expect(amount0).to.equal(initialLiquidity);
      expect(amount1).to.equal(initialLiquidity);
    });

    it("用户可以增加流动性", async function () {
      // 先添加初始流动性
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      const tx1 = await pool.connect(user1).addLiquidity(initialLiquidity, initialLiquidity, 0, 0, deadline);
      const receipt1 = await tx1.wait();

      // 获取tokenId
      const addLiquidityEvent = receipt1.logs.find(log =>
        log.fragment && log.fragment.name === 'AddLiquidity'
      );
      const tokenId = addLiquidityEvent.args[1]; // tokenId

      // 增加流动性
      const additionalAmount = ethers.parseEther("5000");
      await pool.connect(user1).increaseLiquidity(tokenId, additionalAmount, additionalAmount, 0, 0, deadline);

      // 验证头寸信息更新
      const [,, amount0, amount1,] = await pool.getPositionInfo(tokenId);
      expect(amount0).to.equal(initialLiquidity + additionalAmount);
      expect(amount1).to.equal(initialLiquidity + additionalAmount);
    });

    it("用户可以减少流动性", async function () {
      // 先添加初始流动性
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      const tx1 = await pool.connect(user1).addLiquidity(initialLiquidity, initialLiquidity, 0, 0, deadline);
      const receipt1 = await tx1.wait();

      // 获取tokenId
      const addLiquidityEvent = receipt1.logs.find(log =>
        log.fragment && log.fragment.name === 'AddLiquidity'
      );
      const tokenId = addLiquidityEvent.args[1]; // tokenId

      // 减少流动性
      const decreaseAmount = ethers.parseEther("3000");
      await pool.connect(user1).decreaseLiquidity(tokenId, decreaseAmount, decreaseAmount, 0, 0, deadline);

      // 验证头寸信息更新
      const [,, amount0, amount1,] = await pool.getPositionInfo(tokenId);
      expect(amount0).to.equal(initialLiquidity - decreaseAmount);
      expect(amount1).to.equal(initialLiquidity - decreaseAmount);
    });

    it("用户可以移除全部流动性", async function () {
      // 先添加初始流动性
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      const tx1 = await pool.connect(user1).addLiquidity(initialLiquidity, initialLiquidity, 0, 0, deadline);
      const receipt1 = await tx1.wait();

      // 获取tokenId
      const addLiquidityEvent = receipt1.logs.find(log =>
        log.fragment && log.fragment.name === 'AddLiquidity'
      );
      const tokenId = addLiquidityEvent.args[1]; // tokenId

      // 记录移除流动性前的余额
      const user1BtkBefore = await btk.balanceOf(user1.address);
      const user1MtkBefore = await mtk.balanceOf(user1.address);

      // 移除全部流动性
      await pool.connect(user1).removeLiquidity(tokenId, 0, 0, deadline);

      // 验证用户代币增加
      expect(await btk.balanceOf(user1.address)).to.equal(user1BtkBefore + initialLiquidity);
      expect(await mtk.balanceOf(user1.address)).to.equal(user1MtkBefore + initialLiquidity);

      // 验证NFT被销毁
      await expect(positionNFT.ownerOf(tokenId)).to.be.reverted;

      // 验证池余额减少
      const [balance0, balance1] = await pool.getBalances();
      expect(balance0).to.equal(0);
      expect(balance1).to.equal(0);
    });
  });

  describe("交换功能", function () {
    beforeEach(async function () {
      // 添加足够的流动性进行交换测试
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user1).addLiquidity(
        ethers.parseEther("50000"),
        ethers.parseEther("50000"),
        0,
        0,
        deadline
      );
    });

    it("用户可以交换 token0 -> token1", async function () {
      // 记录交换前余额
      const user2BtkBefore = await btk.balanceOf(user2.address);
      const user2MtkBefore = await mtk.balanceOf(user2.address);

      // 交换代币
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user2).swap0to1(swapAmount, 0, deadline);

      // 验证用户代币变化
      expect(await btk.balanceOf(user2.address)).to.equal(user2BtkBefore - swapAmount);
      expect(await mtk.balanceOf(user2.address)).to.be.gt(user2MtkBefore);
    });

    it("用户可以交换 token1 -> token0", async function () {
      // 记录交换前余额
      const user2BtkBefore = await btk.balanceOf(user2.address);
      const user2MtkBefore = await mtk.balanceOf(user2.address);

      // 交换代币
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user2).swap1to0(swapAmount, 0, deadline);

      // 验证用户代币变化
      expect(await btk.balanceOf(user2.address)).to.be.gt(user2BtkBefore);
      expect(await mtk.balanceOf(user2.address)).to.equal(user2MtkBefore - swapAmount);
    });

    it("交换时收取手续费", async function () {
      // 记录初始累积手续费
      const initialFees0 = await pool.accumulatedFees0();
      const initialFees1 = await pool.accumulatedFees1();

      // 进行交换
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user2).swap0to1(swapAmount, 0, deadline);
      await pool.connect(user2).swap1to0(swapAmount, 0, deadline);

      // 验证手续费增加
      expect(await pool.accumulatedFees0()).to.be.gt(initialFees0);
      expect(await pool.accumulatedFees1()).to.be.gt(initialFees1);
    });
  });

  describe("流动性保护功能", function () {
    beforeEach(async function () {
      // 添加初始流动性
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user1).addLiquidity(
        ethers.parseEther("50000"),
        ethers.parseEther("50000"),
        0,
        0,
        deadline
      );
    });

    it("添加流动性时检查截止时间", async function () {
      // 使用过期的截止时间
      const expiredDeadline = Math.floor(Date.now() / 1000) - 60; // 1分钟前

      await expect(
        pool.connect(user2).addLiquidity(
          ethers.parseEther("1000"),
          ethers.parseEther("1000"),
          0,
          0,
          expiredDeadline
        )
      ).to.be.revertedWith("Deadline expired");
    });

    it("添加流动性时检查最小接收量", async function () {
      // 设置最小接收量高于实际添加量
      await expect(
        pool.connect(user2).addLiquidity(
          ethers.parseEther("1000"),
          ethers.parseEther("1000"),
          ethers.parseEther("1001"), // 最小接收量高于实际添加量
          ethers.parseEther("1000"),
          Math.floor(Date.now() / 1000) + 3600 // 1小时
        )
      ).to.be.revertedWith("Amounts below minimum");
    });

    it("添加流动性时检查价格偏离", async function () {
      // 设置较小的最大价格偏离
      await pool.connect(admin).setMaxPriceDeviation(10); // 1%

      // 尝试添加不平衡的流动性
      await expect(
        pool.connect(user2).addLiquidity(
          ethers.parseEther("10000"),
          ethers.parseEther("1000"), // 10:1的比例，与池中的1:1比例相差太大
          0,
          0,
          Math.floor(Date.now() / 1000) + 3600 // 1小时
        )
      ).to.be.revertedWith("Price deviation too high");
    });

    it("交换时应用滑点保护", async function () {
      // 计算预期输出
      const expectedOutput = await pool.calculateSwapOutput(
        await pool.totalAmount0(),
        await pool.totalAmount1(),
        swapAmount,
        true
      );

      // 设置最小输出量高于预期输出
      await expect(
        pool.connect(user2).swap0to1(
          swapAmount,
          expectedOutput + 1n, // 高于预期输出
          Math.floor(Date.now() / 1000) + 3600 // 1小时
        )
      ).to.be.revertedWith("Output below minimum");
    });
  });

  describe("管理功能", function () {
    beforeEach(async function () {
      // 添加流动性并进行一些交换，产生手续费
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user1).addLiquidity(
        ethers.parseEther("50000"),
        ethers.parseEther("50000"),
        0,
        0,
        deadline
      );

      for (let i = 0; i < 5; i++) {
        await pool.connect(user2).swap0to1(swapAmount, 0, deadline);
        await pool.connect(user2).swap1to0(swapAmount, 0, deadline);
      }
    });

    it("管理员可以设置交易费率", async function () {
      // 设置新的交易费率
      const newFee = 10; // 0.1%
      await pool.connect(admin).setSwapFee(newFee);

      // 验证设置成功
      expect(await pool.swapFee()).to.equal(newFee);
    });

    it("管理员可以查看累积的手续费", async function () {
      // 执行交换以生成手续费
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user2).swap0to1(swapAmount, 0, deadline);
      await pool.connect(user2).swap1to0(swapAmount, 0, deadline);

      // 验证有手续费累积
      expect(await pool.accumulatedFees0()).to.be.gt(0);
      expect(await pool.accumulatedFees1()).to.be.gt(0);

      // 验证非管理员不能收取手续费
      await expect(
        pool.connect(user1).collectFees(user1.address)
      ).to.be.revertedWith("OnlyDexPool: caller is not admin");
    });

    it("管理员可以暂停池操作", async function () {
      // 暂停池
      await pool.connect(admin).setPaused(true);
      expect(await pool.paused()).to.be.true;

      // 验证无法添加流动性
      const deadline1 = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await expect(
        pool.connect(user2).addLiquidity(swapAmount, swapAmount, 0, 0, deadline1)
      ).to.be.revertedWith("OnlyDexPool: operations paused");

      // 恢复池
      await pool.connect(admin).setPaused(false);
      expect(await pool.paused()).to.be.false;

      // 验证可以添加流动性
      const deadline2 = Math.floor(Date.now() / 1000) + 3600; // 1小时
      await pool.connect(user2).addLiquidity(swapAmount, swapAmount, 0, 0, deadline2);
    });
  });
});
