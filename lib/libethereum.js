/**
 * Created by ikonovalov on 27/10/16.
 */
const Web3 = require('web3');

class Ethereum {

    constructor(config) {
        this._web3 = new Web3();
        this.web3.setProvider(new this.web3.providers.HttpProvider(config.eth.api));
        this._eth = this.web3.eth;
    }

    get web3() {
        return this._web3;
    }

    get eth() {
        return this._eth;
    }

    get lastBlock() {
        return this.eth.getBlock('latest')
    }

    listAccounts() {
        return this.eth.accounts;
    }

    coinbase() {
        return this.eth.coinbase
    }

    getBalance(account, units = 'ether') {
        return this.web3.fromWei(this.eth.getBalance(account), units)
    }

    txCount(address) {
        return this.eth.getTransactionCount(address);
    }

    txCountWithPending(address) {
        return this.eth.getTransactionCount(address, 'pending')
    }

    get gasPrice() {
        return this.eth.gasPrice;
    }

    get defaultAccount() {
        return this.eth.defaultAccount;
    }

    sendRawTransaction(tx) {
        let txHash = this.eth.sendRawTransaction(tx);
        return txHash;
    }

}

module.exports = Ethereum;