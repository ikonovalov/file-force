/**
 * Created by ikonovalov on 27/10/16.
 */
const mainABI = [{"constant":false,"inputs":[{"name":"ipfs","type":"uint256"},{"name":"owner","type":"address"},{"name":"party","type":"address"}],"name":"ecTagRegistred","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sha256Pref","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsOrigin","type":"uint256"},{"name":"ipfsNew","type":"uint256"},{"name":"fromAcc","type":"address"},{"name":"toAcc","type":"address"}],"name":"ecTagDelegated","outputs":[],"payable":false,"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"},{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"party","type":"address"}],"name":"EcTagRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsOrigin","type":"uint256"},{"indexed":false,"name":"ipfsNew","type":"uint256"},{"indexed":false,"name":"fromAcc","type":"address"},{"indexed":false,"name":"toAcc","type":"address"}],"name":"EcTagDelegated","type":"event"}];

class LibWeb3 {
    constructor(config) {
        var Web3 = require('web3');
        this._web3 = new Web3();
        this._web3.setProvider(new this._web3.providers.HttpProvider(config.eth.api));
        this._eth = this._web3.eth;
        let fileForceMainContract = this._eth.contract(mainABI);
        this._mainContract = fileForceMainContract.at(config.eth['mother-contract']);
    }

    eth() {
        return this.eth;
    }

    mainContract() {
        return this._mainContract;
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