// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./OnlyDexAccess.sol";

/**
 * @title OnlyDexPosition
 * @dev 流动性头寸NFT合约
 */
contract OnlyDexPositionEnumerable is ERC721Enumerable {
    // 事件
    event PositionCreated(
        uint256 indexed tokenId,
        address indexed owner,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    );

    event PoolAuthorized(address indexed pool, bool authorized);

    // 头寸结构
    struct Position {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 createdAt;
    }

    // 权限管理合约
    OnlyDexAccess public accessManager;
    // 头寸信息
    mapping(uint256 => Position) public positions;
    // 代币URI映射
    mapping(uint256 => string) private _tokenURIs;
    // 基础URI
    string private _baseTokenURI;
    // 总供应量 (保留以兼容现有代码，但实际使用ERC721Enumerable的totalSupply)
    uint256 private _totalSupply;
    // 授权池合约集合
    mapping(address => bool) public authorizedPools;

    // 修饰器：仅限管理员
    modifier onlyAdmin() {
        require(accessManager.isAdmin(msg.sender), "OnlyDexPosition: caller is not admin");
        _;
    }

    // 修饰器：仅限授权池合约
    modifier onlyPool() {
        require(authorizedPools[msg.sender], "OnlyDexPosition: caller is not authorized pool");
        _;
    }

    /**
     * @dev 构造函数
     * @param name 代币名称
     * @param symbol 代币符号
     * @param accessManagerAddress 权限管理合约地址
     * @param pool 创建此NFT合约的池合约地址
     */
    constructor(
        string memory name,
        string memory symbol,
        address accessManagerAddress,
        address pool
    ) ERC721(name, symbol) {
        accessManager = OnlyDexAccess(accessManagerAddress);
        _baseTokenURI = "";

        // 如果提供了池地址，则授权该池
        if (pool != address(0)) {
            authorizedPools[pool] = true;
            emit PoolAuthorized(pool, true);
        }
    }

    /**
     * @dev 设置基础URI
     * @param baseURI 基础URI
     */
    function setBaseURI(string memory baseURI) external onlyAdmin {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev 设置池合约授权
     * @param pool 池合约地址
     * @param authorized 是否授权
     */
    function setPoolAuthorization(address pool, bool authorized) external onlyAdmin {
        authorizedPools[pool] = authorized;
        emit PoolAuthorized(pool, authorized);
    }

    /**
     * @dev 铸造NFT
     * @param to 接收者地址
     * @param token0 代币0地址
     * @param token1 代币1地址
     * @param amount0 代币0数量
     * @param amount1 代币1数量
     * @return tokenId 新铸造的NFT ID
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
     * @dev 销毁NFT
     * @param tokenId 代币ID
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
     * @dev 更新头寸信息
     * @param tokenId 代币ID
     * @param amount0 代币0数量
     * @param amount1 代币1数量
     */
    function updatePosition(uint256 tokenId, uint256 amount0, uint256 amount1) external onlyPool {
        require(_exists(tokenId), "Position does not exist");

        positions[tokenId].amount0 = amount0;
        positions[tokenId].amount1 = amount1;
    }

    /**
     * @dev 获取头寸信息
     * @param tokenId 代币ID
     * @return token0 代币0地址
     * @return token1 代币1地址
     * @return amount0 代币0数量
     * @return amount1 代币1数量
     * @return createdAt 创建时间
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
     * @dev 获取总供应量
     * @return 总供应量
     */
    function totalSupply() public view override returns (uint256) {
        return super.totalSupply();
    }

    /**
     * @dev 获取用户拥有的所有tokenId
     * @param owner 用户地址
     * @return 用户拥有的所有tokenId数组
     */
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);

        for (uint256 i = 0; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @dev 检查代币是否存在
     * @param tokenId 代币ID
     * @return 是否存在
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev 设置代币URI
     * @param tokenId 代币ID
     * @param uri URI
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        require(_exists(tokenId), "ERC721Metadata: URI set of nonexistent token");
        _tokenURIs[tokenId] = uri;
    }

    /**
     * @dev 生成代币URI
     * @param tokenId 代币ID
     * @return URI
     */
    function _generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId)));
    }

    /**
     * @dev 将uint256转换为string
     * @param value 数值
     * @return 字符串
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        uint256 temp = value;
        uint256 digits;

        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);

        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }

        return string(buffer);
    }

    /**
     * @dev 获取代币URI
     * @param tokenId 代币ID
     * @return URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];

        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }

        return _generateTokenURI(tokenId);
    }
}
