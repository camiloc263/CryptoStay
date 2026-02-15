// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {BookingNFT} from "./BookingNFT.sol";
import {RewardsToken} from "./RewardsToken.sol";
import {Treasury} from "./Treasury.sol";

/// @notice Payment + booking receipt issuance. Keeps Web2/Web3 flow compatibility.
contract HotelV2 is Ownable {
    IERC20 public usdc;
    BookingNFT public bookingNFT;
    RewardsToken public rewards;
    Treasury public treasury;

    // Web2 reservation id -> paid
    mapping(uint256 => bool) public reservaPagada;

    // Incentives
    address public membershipSBT; // optional, for bonus rewards
    uint16 public baseRewardBps = 200;      // 2% of USD value (demo)
    uint16 public memberBonusBps = 100;     // +1% if has SBT

    event ReservaPagada(uint256 reservaId, address payer, uint256 amountWei, bytes32 txRef);
    event ReservaPagadaUSDC(uint256 reservaId, address payer, uint256 amount, address token, bytes32 txRef);
    event BookingMinted(uint256 reservaId, uint256 tokenId, address to);
    event RewardsMinted(uint256 reservaId, address to, uint256 amount);

    error AlreadyPaid();
    error InvalidAmount();

    constructor(
        address initialOwner,
        address usdcAddress,
        address bookingNftAddress,
        address rewardsAddress,
        address treasuryAddress,
        address membershipSbtAddress
    ) Ownable(initialOwner) {
        usdc = IERC20(usdcAddress);
        bookingNFT = BookingNFT(bookingNftAddress);
        rewards = RewardsToken(rewardsAddress);
        treasury = Treasury(payable(treasuryAddress));
        membershipSBT = membershipSbtAddress;
    }

    function setParams(uint16 _baseRewardBps, uint16 _memberBonusBps) external onlyOwner {
        baseRewardBps = _baseRewardBps;
        memberBonusBps = _memberBonusBps;
    }

    function setMembershipSBT(address sbt) external onlyOwner {
        membershipSBT = sbt;
    }

    // Compatibility: same signature as old Hotel
    function pagarReserva(uint256 reservaId) external payable {
        if (reservaPagada[reservaId]) revert AlreadyPaid();
        if (msg.value == 0) revert InvalidAmount();

        reservaPagada[reservaId] = true;

        // revenue -> treasury
        (bool ok,) = payable(address(treasury)).call{value: msg.value}("");
        require(ok, "treasury transfer failed");

        emit ReservaPagada(reservaId, msg.sender, msg.value, keccak256(abi.encodePacked(reservaId, msg.sender, msg.value, block.number)));

        // mint booking receipt (basic meta; check-in/out can be set offchain later if desired)
        uint256 tokenId = bookingNFT.mint(msg.sender, reservaId, 0, 0, 0, address(0), msg.value);
        emit BookingMinted(reservaId, tokenId, msg.sender);

        // incentives: mint reward token based on payment in wei (demo: 1 wei == 0 reward is nonsense; for now mint fixed)
        // For full demo, UI will also display USD conversions offchain.
        uint256 reward = 1e18; // 1 RWD (demo)
        rewards.mint(msg.sender, reward);
        emit RewardsMinted(reservaId, msg.sender, reward);
    }

    function pagarReservaUSDC(uint256 reservaId, uint256 amount) external {
        if (reservaPagada[reservaId]) revert AlreadyPaid();
        if (amount == 0) revert InvalidAmount();

        reservaPagada[reservaId] = true;

        // transfer to treasury
        bool ok = usdc.transferFrom(msg.sender, address(treasury), amount);
        require(ok, "transferFrom failed");
        treasury.notifyERC20(address(usdc), amount);

        emit ReservaPagadaUSDC(reservaId, msg.sender, amount, address(usdc), keccak256(abi.encodePacked(reservaId, msg.sender, amount, block.number)));

        uint256 tokenId = bookingNFT.mint(msg.sender, reservaId, 0, 0, 0, address(usdc), amount);
        emit BookingMinted(reservaId, tokenId, msg.sender);

        uint256 reward = (amount * 1e12) / 50; // rough demo: 2% of USDC (6d) -> RWD 18d
        rewards.mint(msg.sender, reward);
        emit RewardsMinted(reservaId, msg.sender, reward);
    }
}
