pragma solidity ^0.4.4;

contract FileForce {

    uint16 public constant version = 1;

    uint16 public constant sha256Pref = 4640;

    event EcTagRegistered(uint256 ipfs, address owner, address party);

    event EcTagDelegated(
        uint256 ipfsOrigin,
        uint256 ipfsNew,
        address fromAcc,
        address toAcc
        );

    function FileForce() {

    }

    function ecTagRegistred(uint256 ipfs, address owner, address party) {
        EcTagRegistered(ipfs, owner, party);
    }

    function ecTagDelegated(uint256 ipfsOrigin, uint256 ipfsNew, address fromAcc, address toAcc) {
        EcTagDelegated(ipfsOrigin, ipfsNew, fromAcc, toAcc);
    }

}