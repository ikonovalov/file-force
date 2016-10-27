#!/usr/bin/env node

var fileforceContract = web3.eth.contract([{
    "constant": true,
    "inputs": [],
    "name": "version",
    "outputs": [{"name": "", "type": "uint16"}],
    "payable": false,
    "type": "function"
}, {"inputs": [], "type": "constructor"}, {
    "anonymous": false,
    "inputs": [{"indexed": false, "name": "author", "type": "address"}],
    "name": "FileRegistered",
    "type": "event"
}, {
    "anonymous": false,
    "inputs": [{"indexed": false, "name": "author", "type": "address"}],
    "name": "FileUnregistered",
    "type": "event"
}]);
var fileforce = fileforceContract.new(
    {
        from: web3.eth.accounts[0],
        data: '60606040525b5b60678060126000396000f360606040526000357c01000000000000000000000000000000000000000000000000000000009004806354fd4d50146039576035565b6002565b34600257604860048050506062565b604051808261ffff16815260200191505060405180910390f35b60018156',
        gas: 4700000
    }, function (e, contract) {
        console.log(e, contract);
        if (typeof contract.address !== 'undefined') {
            console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
        }
    })