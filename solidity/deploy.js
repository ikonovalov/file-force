#!/usr/bin/env node

const config = require('../lib/config');
const LibWeb3 = require('../lib/libweb3');
const rpc = new LibWeb3(config);

var fileforceContract = rpc.eth.contract([{"constant":false,"inputs":[{"name":"ipfs","type":"uint256"},{"name":"owner","type":"address"},{"name":"party","type":"address"}],"name":"ecTagRegistred","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sha256Pref","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsOrigin","type":"uint256"},{"name":"ipfsNew","type":"uint256"},{"name":"fromAcc","type":"address"},{"name":"toAcc","type":"address"}],"name":"ecTagDelegated","outputs":[],"payable":false,"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"},{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"party","type":"address"}],"name":"EcTagRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsOrigin","type":"uint256"},{"indexed":false,"name":"ipfsNew","type":"uint256"},{"indexed":false,"name":"fromAcc","type":"address"},{"indexed":false,"name":"toAcc","type":"address"}],"name":"EcTagDelegated","type":"event"}]);
var fileforceTx = fileforceContract.new(
    {
        from: rpc.eth.accounts[0],
        data: '0x60606040525b5b610222806100146000396000f360606040526000357c01000000000000000000000000000000000000000000000000000000009004806346b85d731461005d57806354fd4d501461008c5780636dd203fe146100b8578063ddb98d58146100e457610058565b610002565b346100025761008a600480803590602001909190803590602001909190803590602001909190505061011c565b005b346100025761009e6004805050610195565b604051808261ffff16815260200191505060405180910390f35b34610002576100ca600480505061019a565b604051808261ffff16815260200191505060405180910390f35b346100025761011a60048080359060200190919080359060200190919080359060200190919080359060200190919050506101a0565b005b7f412e39855305b90f29d9cc18c9c1b2c2dc641639d86e2500c6855ec49b378023838383604051808481526020018373ffffffffffffffffffffffffffffffffffffffff1681526020018273ffffffffffffffffffffffffffffffffffffffff168152602001935050505060405180910390a15b505050565b600181565b61122081565b7fde1d784aaf5d88998af3f16de0a528e391f2d497495cade8d346cf32ea5f063b84848484604051808581526020018481526020018373ffffffffffffffffffffffffffffffffffffffff1681526020018273ffffffffffffffffffffffffffffffffffffffff16815260200194505050505060405180910390a15b5050505056',
        gas: '4700000'
    }, function (e, contract){
        console.log(e, contract);
        if (typeof contract.address !== 'undefined') {
            console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
        }
    })