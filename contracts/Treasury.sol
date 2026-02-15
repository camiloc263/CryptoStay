// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Receives revenue, enforces transparent splits, and funds buybacks.
contract Treasury is Ownable {
    address public hotelWallet;
    address public staffWallet;

    // split in basis points (10000 = 100%)
    uint16 public hotelBps = 6000;
    uint16 public staffBps = 3000;
    uint16 public buybackBps = 1000;

    event RevenueReceived(address indexed token, uint256 amount, address indexed from);
    event SplitUpdated(uint16 hotelBps, uint16 staffBps, uint16 buybackBps);
    event Distributed(address indexed token, uint256 hotelAmount, uint256 staffAmount, uint256 buybackAmount);

    error BadSplit();

    constructor(address initialOwner, address _hotelWallet, address _staffWallet) Ownable(initialOwner) {
        hotelWallet = _hotelWallet;
        staffWallet = _staffWallet;
    }

    receive() external payable {
        emit RevenueReceived(address(0), msg.value, msg.sender);
    }

    function notifyERC20(address token, uint256 amount) external {
        // This function is optional for analytics; funds already transferred to Treasury.
        emit RevenueReceived(token, amount, msg.sender);
    }

    function setSplit(uint16 _hotelBps, uint16 _staffBps, uint16 _buybackBps) external onlyOwner {
        if (uint256(_hotelBps) + uint256(_staffBps) + uint256(_buybackBps) != 10000) revert BadSplit();
        hotelBps = _hotelBps;
        staffBps = _staffBps;
        buybackBps = _buybackBps;
        emit SplitUpdated(_hotelBps, _staffBps, _buybackBps);
    }

    function setWallets(address _hotelWallet, address _staffWallet) external onlyOwner {
        hotelWallet = _hotelWallet;
        staffWallet = _staffWallet;
    }

    function distributeETH() external {
        uint256 bal = address(this).balance;
        if (bal == 0) return;
        uint256 hotelAmount = (bal * hotelBps) / 10000;
        uint256 staffAmount = (bal * staffBps) / 10000;
        uint256 buybackAmount = bal - hotelAmount - staffAmount;

        (bool ok1,) = payable(hotelWallet).call{value: hotelAmount}("");
        (bool ok2,) = payable(staffWallet).call{value: staffAmount}("");
        require(ok1 && ok2, "Transfer failed");

        emit Distributed(address(0), hotelAmount, staffAmount, buybackAmount);
        // buybackAmount stays in Treasury
    }

    function distributeERC20(address token) external {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal == 0) return;
        uint256 hotelAmount = (bal * hotelBps) / 10000;
        uint256 staffAmount = (bal * staffBps) / 10000;
        uint256 buybackAmount = bal - hotelAmount - staffAmount;

        require(IERC20(token).transfer(hotelWallet, hotelAmount), "transfer hotel failed");
        require(IERC20(token).transfer(staffWallet, staffAmount), "transfer staff failed");

        emit Distributed(token, hotelAmount, staffAmount, buybackAmount);
        // buybackAmount stays in Treasury
    }
}
