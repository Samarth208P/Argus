// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ArgusAttest {
    event IncidentLogged(bytes32 indexed digest, uint256 timestamp);
    event MerkleRootCommitted(bytes32 indexed root, uint256 hour);

    function logIncident(bytes32 digest) external {
        emit IncidentLogged(digest, block.timestamp);
    }

    function commitMerkleRoot(bytes32 root) external {
        emit MerkleRootCommitted(root, block.timestamp / 3600);
    }
}
