const Web3 = require('web3');
const web3 = new Web3();
const providerUrl = 'http://localhost:8545';
web3.setProvider(new web3.providers.HttpProvider(providerUrl));



const fileforceContract = web3.eth.contract([{
    "constant": true,
    "inputs": [],
    "name": "registeredFiles",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "type": "function"
}, {
    "constant": true,
    "inputs": [],
    "name": "delegatedTags",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "type": "function"
}, {
    "constant": true,
    "inputs": [],
    "name": "version",
    "outputs": [{"name": "", "type": "uint16"}],
    "payable": false,
    "type": "function"
}, {
    "constant": true,
    "inputs": [],
    "name": "sha256Pref",
    "outputs": [{"name": "", "type": "uint16"}],
    "payable": false,
    "type": "function"
}, {
    "constant": false,
    "inputs": [{"name": "ipfs", "type": "uint256"}, {"name": "owner", "type": "address"}, {
        "name": "party",
        "type": "address"
    }],
    "name": "ecTagRegistered",
    "outputs": [],
    "payable": false,
    "type": "function"
}, {
    "constant": false,
    "inputs": [{"name": "ipfsOrigin", "type": "uint256"}, {"name": "ipfsNew", "type": "uint256"}, {
        "name": "fromAcc",
        "type": "address"
    }, {"name": "toAcc", "type": "address"}],
    "name": "ecTagDelegated",
    "outputs": [],
    "payable": false,
    "type": "function"
}, {"inputs": [], "payable": false, "type": "constructor"}, {
    "anonymous": false,
    "inputs": [{"indexed": false, "name": "ipfs", "type": "uint256"}, {
        "indexed": false,
        "name": "owner",
        "type": "address"
    }, {"indexed": false, "name": "party", "type": "address"}],
    "name": "EcTagRegistered",
    "type": "event"
}, {
    "anonymous": false,
    "inputs": [{"indexed": false, "name": "ipfsOrigin", "type": "uint256"}, {
        "indexed": false,
        "name": "ipfsNew",
        "type": "uint256"
    }, {"indexed": false, "name": "fromAcc", "type": "address"}, {
        "indexed": false,
        "name": "toAcc",
        "type": "address"
    }],
    "name": "EcTagDelegated",
    "type": "event"
}]);
let fileforce = fileforceContract.new(
    {
        from: web3.eth.accounts[0],
        data: '0x60606040526000600055600060015534610000575b5b5b6102a5806100246000396000f36060604052361561006f576000357c010000000000000000000000000000000000000000000000000000000090048062eac7311461007457806314bbc08b1461009757806354fd4d50146100ba5780636dd203fe146100e1578063b9e25c8514610108578063ddb98d5814610137575b610000565b346100005761008161016f565b6040518082815260200191505060405180910390f35b34610000576100a4610175565b6040518082815260200191505060405180910390f35b34610000576100c761017b565b604051808261ffff16815260200191505060405180910390f35b34610000576100ee610180565b604051808261ffff16815260200191505060405180910390f35b34610000576101356004808035906020019091908035906020019091908035906020019091905050610186565b005b346100005761016d6004808035906020019091908035906020019091908035906020019091908035906020019091905050610211565b005b60005481565b60015481565b600181565b61122081565b7f412e39855305b90f29d9cc18c9c1b2c2dc641639d86e2500c6855ec49b378023838383604051808481526020018373ffffffffffffffffffffffffffffffffffffffff1681526020018273ffffffffffffffffffffffffffffffffffffffff168152602001935050505060405180910390a16000600081548092919060010191905055505b505050565b7fde1d784aaf5d88998af3f16de0a528e391f2d497495cade8d346cf32ea5f063b84848484604051808581526020018481526020018373ffffffffffffffffffffffffffffffffffffffff1681526020018273ffffffffffffffffffffffffffffffffffffffff16815260200194505050505060405180910390a16001600081548092919060010191905055505b5050505056',
        gas: '4700000'
    }, function (e, contract) {
        console.log(e, contract);
        if (typeof contract.address !== 'undefined') {
            console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
        }
    });