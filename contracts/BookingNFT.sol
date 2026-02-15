// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Non-transferable Booking NFT (soulbound booking receipt)
contract BookingNFT is ERC721, Ownable {
    uint256 public nextId = 1;

    struct BookingMeta {
        uint256 reservaId;
        uint64 checkIn;   // unix seconds
        uint64 checkOut;  // unix seconds
        uint32 noches;
        address paidToken; // address(0)=ETH
        uint256 amount;    // wei or token units
    }

    mapping(uint256 => BookingMeta) public bookingByTokenId;
    mapping(uint256 => uint256) public tokenIdByReservaId;

    error NonTransferable();
    error AlreadyMinted();

    constructor(address initialOwner) ERC721("CryptoStay Booking", "BOOK") Ownable(initialOwner) {}

    function mint(
        address to,
        uint256 reservaId,
        uint64 checkIn,
        uint64 checkOut,
        uint32 noches,
        address paidToken,
        uint256 amount
    ) external onlyOwner returns (uint256 tokenId) {
        if (tokenIdByReservaId[reservaId] != 0) revert AlreadyMinted();
        tokenId = nextId++;
        _safeMint(to, tokenId);
        bookingByTokenId[tokenId] = BookingMeta({
            reservaId: reservaId,
            checkIn: checkIn,
            checkOut: checkOut,
            noches: noches,
            paidToken: paidToken,
            amount: amount
        });
        tokenIdByReservaId[reservaId] = tokenId;
    }

    // Soulbound: block transfers
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // allow mint (from == 0) and burn (to == 0)
        if (from != address(0) && to != address(0)) revert NonTransferable();
        return super._update(to, tokenId, auth);
    }
}
