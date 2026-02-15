// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Non-transferable membership token (SBT-style).
contract MembershipSBT is ERC721 {
    address public owner;
    uint256 public nextId = 1;

    mapping(address => bool) public isMinter;

    error NotOwner();
    error NotMinter();
    error NonTransferable();

    constructor() ERC721("CryptoStay Membership", "CSMEM") {
        owner = msg.sender;
        isMinter[msg.sender] = true;
    }

    function setMinter(address m, bool allowed) external {
        if (msg.sender != owner) revert NotOwner();
        isMinter[m] = allowed;
    }

    function mint(address to) external returns (uint256 tokenId) {
        if (!isMinter[msg.sender]) revert NotMinter();
        tokenId = nextId++;
        _safeMint(to, tokenId);
    }

    function hasMembership(address a) external view returns (bool) {
        return balanceOf(a) > 0;
    }

    // SBT: block transfers (except mint/burn)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert NonTransferable();
        return super._update(to, tokenId, auth);
    }
}
