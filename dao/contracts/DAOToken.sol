// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title DAOToken
/// @notice Token de gobernanza con suministro fijo. Cada token es un voto,
///         pero solo cuenta una vez que el titular lo delega (a sí mismo o a otro).
/// @dev El reloj es por timestamp (segundos), no por bloque, para que los plazos
///      de votación sean iguales en cualquier red.
contract DAOToken is ERC20, ERC20Permit, ERC20Votes {
    error LengthMismatch();

    constructor(
        string memory name_,
        string memory symbol_,
        address[] memory recipients,
        uint256[] memory amounts
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        if (recipients.length != amounts.length) revert LengthMismatch();
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
