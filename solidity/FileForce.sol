pragma solidity ^0.4.5;

contract Administrative {

    mapping(address => bool) public admins;

    function Administrative() {
        admins[msg.sender] = true;
    }

    modifier adminsOnly {
        if (!admins[msg.sender]) {
            throw;
        }
        _;
    }

    function addAdmin(address newAdmin) adminsOnly {
        admins[newAdmin] = true;
    }

}

contract FileForce is Administrative {

    uint256 public totalEcTags = 0;

    uint256 public totalDelegatedEcTags = 0;

    uint256 public totalFileAppeared = 0;

    uint16 public constant version = 3;

    uint16 public constant sha256Pref = 4640;

    bool internal hashBroadcasting = true;

    modifier hashBroadcastingEnabled {
        if (!hashBroadcasting)
            return;
        _;
    }


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

    event NewFileAppeared(
        uint256 ipfs
    );

    function FileForce() {

    }

    function enableHashBroadcasting() adminsOnly {
        hashBroadcasting = true;
    }

    function disableHashBroadcasting() adminsOnly {
        hashBroadcasting = false;
    }

    function ecTagRegistered(uint256 ipfs, address owner, address party) {
        EcTagRegistered(ipfs, owner, party);
        totalEcTags++;
    }

    function ecTagDelegated(uint256 ipfsOrigin, uint256 ipfsNew, address fromAcc, address toAcc) {
        EcTagDelegated(ipfsOrigin, ipfsNew, fromAcc, toAcc);
        totalDelegatedEcTags++;
    }

    function newFileAppeared(uint256 ipfsHash) hashBroadcastingEnabled {
        NewFileAppeared(ipfsHash);
        totalFileAppeared++;
    }

}