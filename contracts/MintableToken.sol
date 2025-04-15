// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MintableToken
 * @dev 可增发的ERC20代币，具有管理员铸造和转账功能
 */
contract MintableToken is ERC20, ERC20Burnable, Ownable {
    // 事件
    event AdminTransfer(address indexed from, address indexed to, uint256 value);
    event AdminMint(address indexed to, uint256 value);

    constructor(uint256 initialSupply) ERC20("MintableToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10**18);
    }

    /**
     * @dev 管理员铸造新代币
     * @param to 接收代币的地址
     * @param amount 铸造的代币数量
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
        emit AdminMint(to, amount);
    }

    /**
     * @dev 管理员强制转账功能，允许管理员在不需要授权的情况下转移代币
     * @param from 转出地址
     * @param to 接收地址
     * @param amount 转账金额
     * @return 是否转账成功
     */
    function adminTransfer(address from, address to, uint256 amount) public onlyOwner returns (bool) {
        require(from != address(0), "MintableToken: transfer from the zero address");
        require(to != address(0), "MintableToken: transfer to the zero address");
        require(amount <= balanceOf(from), "MintableToken: transfer amount exceeds balance");

        _transfer(from, to, amount);
        emit AdminTransfer(from, to, amount);
        return true;
    }

    /**
     * @dev 批量管理员转账功能
     * @param froms 转出地址数组
     * @param tos 接收地址数组
     * @param amounts 转账金额数组
     * @return 是否全部转账成功
     */
    function batchAdminTransfer(
        address[] memory froms,
        address[] memory tos,
        uint256[] memory amounts
    ) public onlyOwner returns (bool) {
        require(froms.length == tos.length && froms.length == amounts.length, "MintableToken: arrays length mismatch");

        for (uint256 i = 0; i < froms.length; i++) {
            require(adminTransfer(froms[i], tos[i], amounts[i]), "MintableToken: transfer failed");
        }

        return true;
    }
}
