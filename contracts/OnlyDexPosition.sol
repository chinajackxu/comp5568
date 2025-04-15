// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./OnlyDexAccess.sol";

/**
 * @title OnlyDexPosition
 * @dev 表示OnlyDex流动性池中份额的NFT
 */
contract OnlyDexPosition is ERC721 {
    using Strings for uint256;

    // 权限管理合约
    OnlyDexAccess public accessManager;

    // 头寸信息
    struct Position {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 createdAt;
    }

    // 头寸ID到头寸信息的映射
    mapping(uint256 => Position) public positions;

    // 代币URI映射
    mapping(uint256 => string) private _tokenURIs;

    // 基础URI
    string private _baseTokenURI;

    // 总供应量
    uint256 private _totalSupply;

    // 授权池合约集合
    mapping(address => bool) public authorizedPools;

    // 事件
    event PositionCreated(uint256 indexed tokenId, address indexed owner, address token0, address token1, uint256 amount0, uint256 amount1);
    event PositionUpdated(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event AccessManagerUpdated(address indexed oldManager, address indexed newManager);
    event PoolAuthorized(address indexed pool, bool authorized);

    // 权限修饰符
    modifier onlyPool() {
        require(authorizedPools[msg.sender], "OnlyDexPosition: not authorized pool");
        _;
    }

    modifier onlyAdmin() {
        require(accessManager.isAdmin(msg.sender), "OnlyDexPosition: not admin");
        _;
    }

    /**
     * @dev 构造函数
     * @param name NFT名称
     * @param symbol NFT符号
     * @param _accessManager 权限管理合约地址
     * @param pool 创建此NFT合约的池合约地址
     */
    constructor(string memory name, string memory symbol, address _accessManager, address pool) ERC721(name, symbol) {
        require(_accessManager != address(0), "Invalid access manager");
        accessManager = OnlyDexAccess(_accessManager);
        _baseTokenURI = "";
        
        // 自动授权池合约
        if (pool != address(0)) {
            authorizedPools[pool] = true;
            emit PoolAuthorized(pool, true);
        }
    }

    /**
     * @dev 创建新的流动性头寸NFT
     * @param to 接收者地址
     * @param token0 第一个代币地址
     * @param token1 第二个代币地址
     * @param amount0 第一个代币数量
     * @param amount1 第二个代币数量
     * @return tokenId 新创建的NFT ID
     */
    function mint(
        address to,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external onlyPool returns (uint256) {
        _totalSupply += 1;
        uint256 tokenId = _totalSupply;

        // 创建头寸信息
        positions[tokenId] = Position({
            token0: token0,
            token1: token1,
            amount0: amount0,
            amount1: amount1,
            createdAt: block.timestamp
        });

        // 铸造NFT
        _safeMint(to, tokenId);

        // 设置元数据URI
        _setTokenURI(tokenId, _generateTokenURI(tokenId));

        emit PositionCreated(tokenId, to, token0, token1, amount0, amount1);

        return tokenId;
    }

    /**
     * @dev 更新头寸信息
     * @param tokenId 头寸ID
     * @param amount0 新的token0数量
     * @param amount1 新的token1数量
     */
    function updatePosition(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1
    ) external onlyPool {
        require(_exists(tokenId), "Position does not exist");

        // 更新头寸信息
        positions[tokenId].amount0 = amount0;
        positions[tokenId].amount1 = amount1;

        // 更新元数据URI
        _setTokenURI(tokenId, _generateTokenURI(tokenId));

        emit PositionUpdated(tokenId, amount0, amount1);
    }

    /**
     * @dev 销毁头寸NFT
     * @param tokenId 头寸ID
     */
    function burn(uint256 tokenId) external onlyPool {
        // 销毁NFT
        _burn(tokenId);

        // 清除头寸信息
        delete positions[tokenId];

        // 清除URI
        delete _tokenURIs[tokenId];
    }

    /**
     * @dev 设置基础URI
     * @param baseURI 新的基础URI
     */
    function setBaseURI(string memory baseURI) external onlyAdmin {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev 授权或取消授权池合约
     * @param pool 池合约地址
     * @param authorized 是否授权
     */
    function setPoolAuthorization(address pool, bool authorized) external onlyAdmin {
        require(pool != address(0), "OnlyDexPosition: invalid pool address");
        authorizedPools[pool] = authorized;
        emit PoolAuthorized(pool, authorized);
    }

    /**
     * @dev 更新权限管理合约
     * @param _newAccessManager 新的权限管理合约地址
     */
    function updateAccessManager(address _newAccessManager) external onlyAdmin {
        require(_newAccessManager != address(0), "OnlyDexPosition: invalid access manager");
        address oldManager = address(accessManager);
        accessManager = OnlyDexAccess(_newAccessManager);
        emit AccessManagerUpdated(oldManager, _newAccessManager);
    }

    /**
     * @dev 获取总供应量
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev 生成代币URI
     * @param tokenId 代币ID
     * @return URI字符串
     */
    function _generateTokenURI(uint256 tokenId) internal pure returns (string memory) {
        return tokenId.toString();
    }

    /**
     * @dev 设置代币URI
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev 返回基础URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev 检查代币是否存在
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev 检查是否为所有者或授权者
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }

    /**
     * @dev 获取头寈信息
     * @param tokenId 头寈ID
     */
    function getPositionInfo(uint256 tokenId) external view returns (
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 createdAt
    ) {
        require(_exists(tokenId), "Position does not exist");
        Position memory position = positions[tokenId];
        return (
            position.token0,
            position.token1,
            position.amount0,
            position.amount1,
            position.createdAt
        );
    }

    /**
     * @dev 获取代币URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // 如果没有基础URI，直接返回代币URI
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // 如果代币URI和基础URI都存在，拼接它们
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }
        // 如果只有基础URI，拼接代币ID
        return string(abi.encodePacked(base, tokenId.toString()));
    }

    /**
     * @dev 仅用于测试目的，允许直接设置池合约授权
     * @param pool 要授权的地址
     */
    function setAuthorizedPoolForTest(address pool) external onlyAdmin {
        authorizedPools[pool] = true;
        emit PoolAuthorized(pool, true);
    }
}
