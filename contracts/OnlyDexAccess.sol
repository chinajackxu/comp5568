// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OnlyDexAccess
 * @dev 用于OnlyDex系统的权限管理合约，只保留管理员角色
 */
contract OnlyDexAccess is AccessControl {
    // 角色定义
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // 事件定义在基础合约中，这里不再重复定义
    
    /**
     * @dev 构造函数
     * @param admin 初始管理员地址
     */
    constructor(address admin) {
        // 设置默认admin角色
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // 授予初始管理员所有角色
        _grantRole(ADMIN_ROLE, admin);
    }
    
    /**
     * @dev 检查地址是否为管理员
     * @param account 要检查的地址
     * @return 是否为管理员
     */
    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }
    
    /**
     * @dev 授予管理员角色
     * @param account 要授予角色的地址
     */
    function grantAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, account);
    }
    
    /**
     * @dev 撤销管理员角色
     * @param account 要撤销角色的地址
     */
    function revokeAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ADMIN_ROLE, account);
    }
} 