/**
 * Created by ikonovalov on 27/10/16.
 */
const Web3 = require('web3');

class Ethereum {

    constructor(config) {
        this.web3 = new Web3();
        this.web3.setProvider(new this.web3.providers.HttpProvider(config.eth.api));
        this.eth = this.web3.eth;
        
    }

    web3() {
        return this.web3();
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

    get defaultAccount() {
        return this.eth.defaultAccount;
    }

    /**
     * SHA3 of method signature.
     * Example: multiply(uint256) => 'c6888fa1'
     * @param method
     */
    methodSelector(method) {
        this.web3.sha3(method).substring(0, 8)
    }

}

module.exports = Ethereum;