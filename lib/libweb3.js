/**
 * Created by ikonovalov on 27/10/16.
 */
var Web3 = require('web3');
var web3 = new Web3();
var providerUrl = 'http://localhost:8545';
web3.setProvider(new web3.providers.HttpProvider(providerUrl));

class LibWeb3 {
    constructor(config) {
        var Web3 = require('web3');
        this.web3 = new Web3();
        this.web3.setProvider(config.eth.api);
        this.eth = web3.eth;
    }

    web3() {
        return web3;
    }

    eth() {
        return this.eth;
    }

    listAccounts() {
        return this.eth.accounts;
    }

    coinbase(){
        return this.eth.coinbase
    }

    getBalance(account, units = 'ether'){
        return this.web3.fromWei(this.eth.getBalance(account), units)
    }

    defaultAccount() {
        return this.eth.defaultAccount;
    }
}

module.exports = LibWeb3;