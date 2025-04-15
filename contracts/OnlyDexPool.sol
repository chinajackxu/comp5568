// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./OnlyDexAccess.sol";
import "./OnlyDexPositionEnumerable.sol";

/**
 * @title OnlyDexPool
 * @dev 基于Curve StableSwap算法的稳定币交易池
 * 支持BTK和MTK两种代币之间的交换
 * 使用NFT表示流动性份额
 */
contract OnlyDexPool {
    using SafeERC20 for IERC20;

    // 池中的两种代币
    IERC20 public token0; // BasicToken (BTK)
    IERC20 public token1; // MintableToken (MTK)

    // 权限管理合约
    OnlyDexAccess public accessManager;

    // NFT头寸合约
    OnlyDexPositionEnumerable public positionNFT;

    // 曲线参数
    uint256 public A = 50; // 放大系数，控制曲线形状
    uint256 public constant N = 2; // 资产数量
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public swapFee = 4; // 0.04% 交易费

    // 精度常数
    uint256 private constant PRECISION = 1e18;

    // 总流动性跟踪
    uint256 public totalAmount0;
    uint256 public totalAmount1;

    // 池状态
    bool public paused = false;

    // 累积手续费
    uint256 public accumulatedFees0;
    uint256 public accumulatedFees1;

    // 流动性保护参数
    uint256 public maxPriceDeviation = 50; // 最大价格偏离，默认5%（以千分之一为单位）
    uint256 public constant MAX_DEADLINE = 2 days; // 最大截止时间

    // 事件
    event AddLiquidity(address indexed provider, uint256 tokenId, uint256 amount0, uint256 amount1);
    event RemoveLiquidity(address indexed provider, uint256 tokenId, uint256 amount0, uint256 amount1);
    event IncreaseLiquidity(uint256 indexed tokenId, uint256 addedAmount0, uint256 addedAmount1);
    event DecreaseLiquidity(uint256 indexed tokenId, uint256 removedAmount0, uint256 removedAmount1);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool isToken0In);
    event ParameterUpdate(string name, uint256 value);
    event PausedStateChanged(bool paused);
    event AccessManagerUpdated(address indexed oldManager, address indexed newManager);
    event FeesCollected(address indexed collector, uint256 amount0, uint256 amount1);
    event MaxPriceDeviationUpdated(uint256 oldValue, uint256 newValue);
    event LiquidityProtectionTriggered(address indexed user, string reason);

    // 权限修饰符
    modifier onlyAdmin() {
        require(accessManager.isAdmin(msg.sender), "OnlyDexPool: caller is not admin");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "OnlyDexPool: operations paused");
        _;
    }

    /**
     * @dev 构造函数
     * @param _token0 第一个代币地址
     * @param _token1 第二个代币地址
     * @param _accessManager 权限管理合约地址
     */
    constructor(address _token0, address _token1, address _accessManager) {
        require(_token0 != address(0) && _token1 != address(0), "Invalid token address");
        require(_token0 != _token1, "Tokens must be different");
        require(_accessManager != address(0), "Invalid access manager");

        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        accessManager = OnlyDexAccess(_accessManager);

        // 创建NFT头寸合约
        positionNFT = new OnlyDexPositionEnumerable("OnlyDex Position", "OLPOS", _accessManager, address(this));

        // 不再需要手动授权，因为在OnlyDexPosition构造函数中已经自动授权了
        // positionNFT.setPoolAuthorization(address(this), true);
    }

    /**
     * @dev 获取池中的余额
     * @return balance0 token0的余额
     * @return balance1 token1的余额
     */
    function getBalances() public view returns (uint256 balance0, uint256 balance1) {
        balance0 = token0.balanceOf(address(this));
        balance1 = token1.balanceOf(address(this));
    }

    /**
     * @dev 添加流动性并创建新的NFT头寸
     * @param amount0 添加的token0数量
     * @param amount1 添加的token1数量
     * @param minAmount0 最小接受的token0数量（滑点保护）
     * @param minAmount1 最小接受的token1数量（滑点保护）
     * @param deadline 交易截止时间
     * @return tokenId 创建的NFT头寸ID
     */
    function addLiquidity(
        uint256 amount0,
        uint256 amount1,
        uint256 minAmount0,
        uint256 minAmount1,
        uint256 deadline
    ) external whenNotPaused returns (uint256 tokenId) {
        require(amount0 > 0 && amount1 > 0, "Amounts must be greater than 0");
        require(amount0 >= minAmount0 && amount1 >= minAmount1, "Amounts below minimum");
        require(deadline >= block.timestamp, "Deadline expired");
        require(deadline <= block.timestamp + MAX_DEADLINE, "Deadline too far");

        // 检查价格偏离
        if (!_checkPriceDeviation(amount0, amount1)) {
            emit LiquidityProtectionTriggered(msg.sender, "Price deviation too high");
            revert("Price deviation too high");
        }

        // 转入代币
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        // 更新总流动性
        totalAmount0 += amount0;
        totalAmount1 += amount1;

        // 创建NFT头寸
        tokenId = positionNFT.mint(
            msg.sender,
            address(token0),
            address(token1),
            amount0,
            amount1
        );

        emit AddLiquidity(msg.sender, tokenId, amount0, amount1);
        return tokenId;
    }

    /**
     * @dev 增加现有NFT头寸的流动性
     * @param tokenId NFT头寸ID
     * @param amount0 添加的token0数量
     * @param amount1 添加的token1数量
     * @param minAmount0 最小接受的token0数量（滑点保护）
     * @param minAmount1 最小接受的token1数量（滑点保护）
     * @param deadline 交易截止时间
     */
    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1,
        uint256 minAmount0,
        uint256 minAmount1,
        uint256 deadline
    ) external whenNotPaused {
        require(amount0 > 0 || amount1 > 0, "Must add some liquidity");
        require(amount0 >= minAmount0 && amount1 >= minAmount1, "Amounts below minimum");
        require(deadline >= block.timestamp, "Deadline expired");
        require(deadline <= block.timestamp + MAX_DEADLINE, "Deadline too far");
        require(positionNFT.ownerOf(tokenId) == msg.sender, "Not the owner of the position");

        // 获取当前头寸信息
        (,, uint256 currentAmount0, uint256 currentAmount1,) = getPositionInfo(tokenId);

        // 检查价格偏离
        if (!_checkPriceDeviation(amount0, amount1)) {
            emit LiquidityProtectionTriggered(msg.sender, "Price deviation too high");
            revert("Price deviation too high");
        }

        // 转入代币
        if (amount0 > 0) {
            token0.safeTransferFrom(msg.sender, address(this), amount0);
        }
        if (amount1 > 0) {
            token1.safeTransferFrom(msg.sender, address(this), amount1);
        }

        // 更新总流动性
        totalAmount0 += amount0;
        totalAmount1 += amount1;

        // 更新NFT头寸
        positionNFT.updatePosition(
            tokenId,
            currentAmount0 + amount0,
            currentAmount1 + amount1
        );

        emit IncreaseLiquidity(tokenId, amount0, amount1);
    }

    /**
     * @dev 减少NFT头寸的流动性
     * @param tokenId NFT头寸ID
     * @param amount0 移除的token0数量
     * @param amount1 移除的token1数量
     * @param minAmount0 最小接受的token0数量（滑点保护）
     * @param minAmount1 最小接受的token1数量（滑点保护）
     * @param deadline 交易截止时间
     */
    function decreaseLiquidity(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1,
        uint256 minAmount0,
        uint256 minAmount1,
        uint256 deadline
    ) external whenNotPaused {
        require(amount0 > 0 || amount1 > 0, "Must remove some liquidity");
        require(amount0 >= minAmount0 && amount1 >= minAmount1, "Amounts below minimum");
        require(deadline >= block.timestamp, "Deadline expired");
        require(deadline <= block.timestamp + MAX_DEADLINE, "Deadline too far");
        require(positionNFT.ownerOf(tokenId) == msg.sender, "Not the owner of the position");

        // 获取当前头寸信息
        (,, uint256 currentAmount0, uint256 currentAmount1,) = getPositionInfo(tokenId);

        // 确保不会移除过多
        require(amount0 <= currentAmount0, "Removing too much token0");
        require(amount1 <= currentAmount1, "Removing too much token1");

        // 检查价格偏离
        if (!_checkPriceDeviation(amount0, amount1)) {
            emit LiquidityProtectionTriggered(msg.sender, "Price deviation too high");
            revert("Price deviation too high");
        }

        // 更新总流动性
        totalAmount0 -= amount0;
        totalAmount1 -= amount1;

        // 更新NFT头寸
        positionNFT.updatePosition(
            tokenId,
            currentAmount0 - amount0,
            currentAmount1 - amount1
        );

        // 转出代币
        if (amount0 > 0) {
            token0.safeTransfer(msg.sender, amount0);
        }
        if (amount1 > 0) {
            token1.safeTransfer(msg.sender, amount1);
        }

        emit DecreaseLiquidity(tokenId, amount0, amount1);
    }

    /**
     * @dev 移除全部流动性并销毁NFT头寸
     * @param tokenId NFT头寸ID
     * @param minAmount0 最小接受的token0数量（滑点保护）
     * @param minAmount1 最小接受的token1数量（滑点保护）
     * @param deadline 交易截止时间
     * @return amount0 返还的token0数量
     * @return amount1 返还的token1数量
     */
    function removeLiquidity(
        uint256 tokenId,
        uint256 minAmount0,
        uint256 minAmount1,
        uint256 deadline
    ) external whenNotPaused returns (uint256 amount0, uint256 amount1) {
        require(deadline >= block.timestamp, "Deadline expired");
        require(deadline <= block.timestamp + MAX_DEADLINE, "Deadline too far");
        require(positionNFT.ownerOf(tokenId) == msg.sender, "Not the owner of the position");

        // 获取头寸信息
        (,, amount0, amount1,) = getPositionInfo(tokenId);

        // 检查最小接受量
        require(amount0 >= minAmount0 && amount1 >= minAmount1, "Amounts below minimum");

        // 更新总流动性
        totalAmount0 -= amount0;
        totalAmount1 -= amount1;

        // 销毁NFT头寸
        positionNFT.burn(tokenId);

        // 转出代币
        if (amount0 > 0) {
            token0.safeTransfer(msg.sender, amount0);
        }
        if (amount1 > 0) {
            token1.safeTransfer(msg.sender, amount1);
        }

        emit RemoveLiquidity(msg.sender, tokenId, amount0, amount1);
        return (amount0, amount1);
    }

    /**
     * @dev 获取头寸信息
     * @param tokenId NFT头寸ID
     * @return posToken0 第一个代币地址
     * @return posToken1 第二个代币地址
     * @return amount0 第一个代币数量
     * @return amount1 第二个代币数量
     * @return createdAt 创建时间
     */
    function getPositionInfo(uint256 tokenId) public view returns (
        address posToken0,
        address posToken1,
        uint256 amount0,
        uint256 amount1,
        uint256 createdAt
    ) {
        // 获取头寈信息
        // 注意：这里我们需要实现一个辅助函数来获取头寈信息
        // 因为我们不能直接访问另一个合约的结构体成员

        // 调用合约的辅助函数获取头寈信息
        (posToken0, posToken1, amount0, amount1, createdAt) = _getPositionInfoFromNFT(tokenId);
    }

    /**
     * @dev 从头寈NFT合约获取头寈信息的辅助函数
     * @param tokenId NFT头寈ID
     */
    function _getPositionInfoFromNFT(uint256 tokenId) internal view returns (
        address posToken0,
        address posToken1,
        uint256 amount0,
        uint256 amount1,
        uint256 createdAt
    ) {
        // 调用NFT合约的getPositionInfo函数获取头寈信息
        return positionNFT.getPositionInfo(tokenId);
    }

    /**
     * @dev 交换代币：token0 -> token1
     * @param amountIn 输入的token0数量
     * @param minAmountOut 最小输出的token1数量（滑点保护）
     * @param deadline 交易截止时间
     * @return amountOut 输出的token1数量
     */
    function swap0to1(
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external whenNotPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(deadline >= block.timestamp, "Deadline expired");
        require(deadline <= block.timestamp + MAX_DEADLINE, "Deadline too far");

        // 获取当前余额
        (uint256 balance0, uint256 balance1) = getBalances();

        // 转入代币
        token0.safeTransferFrom(msg.sender, address(this), amountIn);

        // 计算输出金额
        amountOut = calculateSwapOutput(balance0, balance1, amountIn, true);

        // 确保池中有足够的代币且满足最小输出量
        require(amountOut > 0 && amountOut <= balance1, "Invalid output amount");
        require(amountOut >= minAmountOut, "Output below minimum");

        // 计算手续费
        uint256 fee = amountIn * swapFee / FEE_DENOMINATOR;
        accumulatedFees0 += fee;

        // 转出代币
        token1.safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, amountIn, amountOut, true);
        return amountOut;
    }

    /**
     * @dev 交换代币：token1 -> token0
     * @param amountIn 输入的token1数量
     * @param minAmountOut 最小输出的token0数量（滑点保护）
     * @param deadline 交易截止时间
     * @return amountOut 输出的token0数量
     */
    function swap1to0(
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external whenNotPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(deadline >= block.timestamp, "Deadline expired");
        require(deadline <= block.timestamp + MAX_DEADLINE, "Deadline too far");

        // 获取当前余额
        (uint256 balance0, uint256 balance1) = getBalances();

        // 转入代币
        token1.safeTransferFrom(msg.sender, address(this), amountIn);

        // 计算输出金额
        amountOut = calculateSwapOutput(balance0, balance1, amountIn, false);

        // 确保池中有足够的代币且满足最小输出量
        require(amountOut > 0 && amountOut <= balance0, "Invalid output amount");
        require(amountOut >= minAmountOut, "Output below minimum");

        // 计算手续费
        uint256 fee = amountIn * swapFee / FEE_DENOMINATOR;
        accumulatedFees1 += fee;

        // 转出代币
        token0.safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, amountIn, amountOut, false);
        return amountOut;
    }

    /**
     * @dev 计算交换输出金额
     * @param balance0 当前token0余额
     * @param balance1 当前token1余额
     * @param amountIn 输入金额
     * @param isToken0In 是否输入token0
     * @return 输出金额
     */
    function calculateSwapOutput(
        uint256 balance0,
        uint256 balance1,
        uint256 amountIn,
        bool isToken0In
    ) public view returns (uint256) {
        // 计算当前的不变量K
        uint256 K = calculateD(balance0, balance1); // 现在这个函数计算的是K = x * y

        // 根据输入方向更新余额
        uint256 newBalance = isToken0In ? balance0 + amountIn : balance1 + amountIn;

        // 计算新的余额，保持K不变
        uint256 otherBalance = K / newBalance;

        // 计算输出金额
        uint256 dy = isToken0In ? balance1 - otherBalance : balance0 - otherBalance;

        // 扣除交易费用
        dy = dy * (FEE_DENOMINATOR - swapFee) / FEE_DENOMINATOR;

        return dy;
    }

    /**
     * @dev 计算不变量K
     * 使用恒定乘积公式: k = x * y
     * @param x0 token0余额
     * @param x1 token1余额
     * @return 不变量K
     */
    function calculateD(uint256 x0, uint256 x1) public view returns (uint256) {
        // 注意：我们保留函数名为calculateD以保持兼容性
        // 但实际上这个函数现在计算的是K = x * y
        if (x0 == 0 || x1 == 0) return 0;

        // 直接返回x0 * x1
        return x0 * x1;
    }

    /**
     * @dev 计算y，使得不变量K保持不变
     * @param K 不变量K（实际上是x*y）
     * @param x 已知的一个资产余额
     * @param isToken0 是否x代表token0（在恒定乘积模型中不再需要这个参数，但保留以保持兼容性）
     * @return 另一个资产的余额
     */
    function getY(uint256 K, uint256 x, bool isToken0) public view returns (uint256) {
        // 处理边界情况
        if (K == 0 || x == 0) return 0;

        // 在恒定乘积模型中，直接计算 y = K / x
        return K / x;
    }

    /**
     * @dev 获取当前汇率
     * @return rate token0:token1的汇率（乘以1e18）
     */
    function getRate() external view returns (uint256 rate) {
        (uint256 balance0, uint256 balance1) = getBalances();
        if (balance0 == 0 || balance1 == 0) return 0;

        // 在恒定乘积模型中，汇率就是余额比例
        // 1个token0可以换多少token1 = (balance1 / balance0) * (1 - 手续费率)
        uint256 rawRate = balance1 * PRECISION / balance0;
        return rawRate * (FEE_DENOMINATOR - swapFee) / FEE_DENOMINATOR;
    }

    /**
     * @dev 检查价格偏离
     * @param amount0 token0数量
     * @param amount1 token1数量
     * @return 是否在允许的偏离范围内
     */
    function _checkPriceDeviation(uint256 amount0, uint256 amount1) internal view returns (bool) {
        // 如果池中没有流动性，则不检查价格偏离
        if (totalAmount0 == 0 || totalAmount1 == 0) return true;

        // 在恒定乘积模型中，价格就是余额比例
        // 计算当前池中的价格比例
        uint256 currentRatio = totalAmount0 * PRECISION / totalAmount1;

        // 计算新添加的流动性的价格比例
        if (amount1 == 0) return false; // 防止除零
        uint256 newRatio = amount0 * PRECISION / amount1;

        // 计算偏离百分比
        uint256 deviation;
        if (newRatio > currentRatio) {
            deviation = (newRatio - currentRatio) * 1000 / currentRatio;
        } else {
            deviation = (currentRatio - newRatio) * 1000 / currentRatio;
        }

        // 检查偏离是否在允许范围内
        return deviation <= maxPriceDeviation;
    }

    /**
     * @dev 设置放大系数A
     * @param _A 新的放大系数
     */
    function setAmplificationParameter(uint256 _A) external onlyAdmin {
        require(_A >= 1 && _A <= 1000, "Invalid A");
        A = _A;
        emit ParameterUpdate("A", _A);
    }

    /**
     * @dev 设置交易费用
     * @param _swapFee 新的交易费用（基点，1 = 0.01%）
     */
    function setSwapFee(uint256 _swapFee) external onlyAdmin {
        require(_swapFee <= 100, "Fee too high"); // 最高1%
        swapFee = _swapFee;
        emit ParameterUpdate("swapFee", _swapFee);
    }

    /**
     * @dev 设置最大价格偏离
     * @param _maxPriceDeviation 新的最大价格偏离（千分之一，10 = 1%）
     */
    function setMaxPriceDeviation(uint256 _maxPriceDeviation) external onlyAdmin {
        require(_maxPriceDeviation > 0 && _maxPriceDeviation <= 200, "Invalid deviation"); // 最大偏离20%
        uint256 oldValue = maxPriceDeviation;
        maxPriceDeviation = _maxPriceDeviation;
        emit MaxPriceDeviationUpdated(oldValue, _maxPriceDeviation);
    }

    /**
     * @dev 获取累积的手续费
     * @return fees0 累积的token0手续费
     * @return fees1 累积的token1手续费
     */
    function getAccumulatedFees() public view returns (uint256 fees0, uint256 fees1) {
        return (accumulatedFees0, accumulatedFees1);
    }

    /**
     * @dev 管理员提取累积的手续费
     * @param recipient 接收手续费的地址
     * @return amount0 提取的token0手续费
     * @return amount1 提取的token1手续费
     */
    function collectFees(address recipient) external onlyAdmin returns (uint256 amount0, uint256 amount1) {
        require(recipient != address(0), "Invalid recipient");

        amount0 = accumulatedFees0;
        amount1 = accumulatedFees1;

        if (amount0 > 0) {
            accumulatedFees0 = 0;
            token0.safeTransfer(recipient, amount0);
        }

        if (amount1 > 0) {
            accumulatedFees1 = 0;
            token1.safeTransfer(recipient, amount1);
        }

        emit FeesCollected(recipient, amount0, amount1);
        return (amount0, amount1);
    }

    /**
     * @dev 暂停/恢复池操作
     * @param _paused 是否暂停
     */
    function setPaused(bool _paused) external onlyAdmin {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    /**
     * @dev 更新权限管理合约
     * @param _newAccessManager 新的权限管理合约地址
     */
    function updateAccessManager(address _newAccessManager) external onlyAdmin {
        require(_newAccessManager != address(0), "OnlyDexPool: invalid access manager");
        address oldManager = address(accessManager);
        accessManager = OnlyDexAccess(_newAccessManager);
        emit AccessManagerUpdated(oldManager, _newAccessManager);
    }

    /**
     * @dev 紧急提取代币（仅限管理员）
     * @param token 要提取的代币地址
     * @param to 接收地址
     * @param amount 提取金额
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyAdmin {
        IERC20(token).safeTransfer(to, amount);
    }
}
