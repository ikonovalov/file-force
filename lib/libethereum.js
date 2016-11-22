/**
 * Created by ikonovalov on 27/10/16.
 */
const multihash = require('multihashes');
const BigNumber = require('bignumber.js');

const mainABI = [{"constant":false,"inputs":[{"name":"ipfs","type":"uint256"},{"name":"owner","type":"address"},{"name":"party","type":"address"}],"name":"ecTagRegistred","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sha256Pref","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsOrigin","type":"uint256"},{"name":"ipfsNew","type":"uint256"},{"name":"fromAcc","type":"address"},{"name":"toAcc","type":"address"}],"name":"ecTagDelegated","outputs":[],"payable":false,"type":"function"},{"inputs":[],"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"},{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"party","type":"address"}],"name":"EcTagRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsOrigin","type":"uint256"},{"indexed":false,"name":"ipfsNew","type":"uint256"},{"indexed":false,"name":"fromAcc","type":"address"},{"indexed":false,"name":"toAcc","type":"address"}],"name":"EcTagDelegated","type":"event"}];

const EC_TAG_REG_LIMIT = 1000000;
const EC_TAG_DELEGATE_LIMIT = 1000000;

class Ethereum {

    constructor(config) {
        var Web3 = require('web3');
        this._web3 = new Web3();
        this._web3.setProvider(new this._web3.providers.HttpProvider(config.eth.api));
        this._eth = this._web3.eth;
        let fileForceMainContract = this._eth.contract(mainABI);
        this._mainContract = fileForceMainContract.at(config.eth['mother-contract']);
    }


    registerEcTag(ipfsHashArr, ecTag) {
        let ipfsHashDec = multihash.decode(ipfsHashArr);
        let ipfsDigest = new BigNumber('0x' + ipfsHashDec.digest.toString('hex'));
        let ownerBN = new BigNumber(ecTag.ownerAddress);
        let partyBN = new BigNumber(ecTag.partyAddress);
        try {
            this._mainContract.ecTagRegistred.sendTransaction(
                ipfsDigest,
                ownerBN,
                partyBN, {
                    from: ecTag.ownerAddress,
                    gas: EC_TAG_REG_LIMIT
                }
            );
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    listAccounts() {
        return this._eth.accounts;
    }

    coinbase(){
        return this._eth.coinbase
    }

    getBalance(account, units = 'ether') {
        return this._web3.fromWei(this._eth.getBalance(account), units)
    }

    defaultAccount() {

        return this._eth.defaultAccount;
    }
}



module.exports = Ethereum;