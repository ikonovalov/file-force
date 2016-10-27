pragma solidity ^0.4.3;

contract FileForce {

    uint16 public constant version = 1;

    struct Document {
        
        address author;

        uint16 typeIndex;

        LocationChallenge location; 
    }

    // encrypted location and other surprises
    struct LocationChallenge {

    }

    event FileRegistred(address author);

    event FileUnregistred(address autor); 

    // constructor
    function FileForce() {

    }

}