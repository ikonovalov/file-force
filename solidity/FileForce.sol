pragma solidity ^0.4.5;

contract FileForce {

    uint256 public registeredFiles = 0;

    uint256 public delegatedTags = 0;

    uint16 public constant version = 2;

    uint16 public constant sha256Pref = 4640;


    event EcTagRegistered(
        uint256 ipfs,
        address owner,
        address party
    );

    event EcTagDelegated(
        uint256 ipfsOrigin,
        uint256 ipfsNew,
        address fromAcc,
        address toAcc
    );

    function FileForce() {

    }

    function ecTagRegistered(uint256 ipfs, address owner, address party) {
        EcTagRegistered(ipfs, owner, party);
        registeredFiles++;
    }

    function ecTagDelegated(uint256 ipfsOrigin, uint256 ipfsNew, address fromAcc, address toAcc) {
        EcTagDelegated(ipfsOrigin, ipfsNew, fromAcc, toAcc);
        delegatedTags++;
    }

}