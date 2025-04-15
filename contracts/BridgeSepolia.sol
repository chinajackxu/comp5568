// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeSepolia is Ownable {
    IERC20 public token;
    mapping(bytes32 => bool) public processedTxs;
    
    event TokensLocked(address from, uint256 amount, bytes32 txHash, address recipient);
    event TokensUnlocked(address to, uint256 amount, bytes32 txHash);
    
    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }
    
    // User locks tokens on Sepolia to transfer to Hardhat network
    function lockTokens(uint256 amount, bytes32 destinationTxHash, address recipient) external {
        require(amount > 0, "Amount must be greater than 0");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit TokensLocked(msg.sender, amount, destinationTxHash, recipient);
    }
    
    // Bridge operator unlocks tokens on Sepolia when they are locked on Hardhat
    function unlockTokens(address to, uint256 amount, bytes32 sourceTxHash) external onlyOwner {
        require(!processedTxs[sourceTxHash], "Transaction already processed");
        require(amount > 0, "Amount must be greater than 0");
        
        processedTxs[sourceTxHash] = true;
        require(token.transfer(to, amount), "Transfer failed");
        
        emit TokensUnlocked(to, amount, sourceTxHash);
    }
} 