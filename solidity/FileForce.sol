pragma solidity ^0.4.3;

contract FileForce {

    uint16 public constant version = 1;

    struct Document {
        address author;

        LocationChallenge location; 
    }

    event FileRegistered(address author);

    event FileUnregistered(address author);

    // constructor
    function FileForce() {

    }

}