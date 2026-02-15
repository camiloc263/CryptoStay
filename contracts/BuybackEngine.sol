// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @notice Demo buyback & burn engine (fixed price).
/// Users sell RWD to this contract; it burns RWD and pays ETH from its balance.
/// The ETH balance should be funded from Treasury's buyback bucket in demos.
contract BuybackEngine is Ownable {
    ERC20Burnable public immutable rewards;

    // price in wei per 1 RWD (18 decimals)
    uint256 public weiPerRwd;

    event Funded(address indexed from, uint256 amountWei);
    event PriceUpdated(uint256 weiPerRwd);
    event BoughtBackAndBurned(address indexed seller, uint256 rwdAmount, uint256 ethPaid);

    error BadAmount();
    error InsufficientETH();

    constructor(address initialOwner, address rewardsToken, uint256 _weiPerRwd) Ownable(initialOwner) {
        rewards = ERC20Burnable(rewardsToken);
        weiPerRwd = _weiPerRwd;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    function setPrice(uint256 _weiPerRwd) external onlyOwner {
        weiPerRwd = _weiPerRwd;
        emit PriceUpdated(_weiPerRwd);
    }

    /// @notice User sells RWD; contract burns and pays ETH at fixed price.
    function sellAndBurn(uint256 rwdAmount) external {
        if (rwdAmount == 0) revert BadAmount();

        // rwd has 18 decimals
        uint256 ethToPay = (rwdAmount * weiPerRwd) / 1e18;
        if (address(this).balance < ethToPay) revert InsufficientETH();

        // pull RWD from seller
        require(IERC20(address(rewards)).transferFrom(msg.sender, address(this), rwdAmount), "transferFrom failed");

        // burn what we received
        rewards.burn(rwdAmount);

        (bool ok,) = payable(msg.sender).call{value: ethToPay}("");
        require(ok, "ETH transfer failed");

        emit BoughtBackAndBurned(msg.sender, rwdAmount, ethToPay);
    }

    function engineBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
