/**
 * Created by ikonovalov on 27/10/16.
 */
const multihash = require('multihashes');
const BigNumber = require('bignumber.js');

const mainABI = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"admins","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalDelegatedEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sha256Pref","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"disableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newAdmin","type":"address"}],"name":"addAdmin","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"enableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalFileAppeared","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfs","type":"uint256"},{"name":"owner","type":"address"},{"name":"party","type":"address"}],"name":"ecTagRegistered","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsHash","type":"uint256"}],"name":"newFileAppeared","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsOrigin","type":"uint256"},{"name":"ipfsNew","type":"uint256"},{"name":"fromAcc","type":"address"},{"name":"toAcc","type":"address"}],"name":"ecTagDelegated","outputs":[],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"},{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"party","type":"address"}],"name":"EcTagRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsOrigin","type":"uint256"},{"indexed":false,"name":"ipfsNew","type":"uint256"},{"indexed":false,"name":"fromAcc","type":"address"},{"indexed":false,"name":"toAcc","type":"address"}],"name":"EcTagDelegated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsHash","type":"uint256"}],"name":"NewFileAppeared","type":"event"}];

const EC_TAG_REG_LIMIT = 1000000;
const EC_TAG_DELEGATE_LIMIT = 1000000;

function decodeToBN256(hash) {
    let ipfsHashArr = multihash.fromB58String(hash);
    let ipfsHashDec = multihash.decode(ipfsHashArr);
    let ipfsDigest = new BigNumber('0x' + ipfsHashDec.digest.toString('hex'));
    return ipfsDigest;
}

var unlock = function (account) {
    console.log(`Account unlocked - ${this._web3.personal.unlockAccount(account, 'dlheu0')}`.red.bold);
};

class Ethereum {

    constructor(config) {
        const Web3 = require('web3');
        this._web3 = new Web3();
        this._web3.setProvider(new this._web3.providers.HttpProvider(config.eth.api));
        this._eth = this._web3.eth;
        let fileForceMainContract = this._eth.contract(mainABI);
        this._mainContract = fileForceMainContract.at(config.eth['mother-contract']);
    }


    /**
     * Register IPFS hash and ecTag in Ethereum contract.
     * @param ipfsHashArr
     * @param ecTag
     * @returns {eth.tx}
     */
    registerEcTag(ipfsHash, ecTag) {
        let ipfsDigest = decodeToBN256(ipfsHash);
        unlock.call(this, ecTag.ownerAddress);
        try {
            let tx = this._mainContract.ecTagRegistered.sendTransaction(
                ipfsDigest,
                ecTag.ownerAddress,
                ecTag.partyAddress,
                {
                    from: ecTag.ownerAddress,
                    gas: EC_TAG_REG_LIMIT
                }
            );
            return tx;
        } catch (e) {
            let accountLocked = e.message == 'account is locked';
            console.error(e);
            throw e;
        }
    }

    registerNewFile(ipfsHash, fromAccount) {
        let ipfsDigest = decodeToBN256(ipfsHash);
        unlock.call(this, fromAccount);
        let tx = this._mainContract.newFileAppeared.sendTransaction(
            ipfsDigest,
            {
                from: fromAccount,
                gas: 1000001
            }
        );
    }

    listAccounts() {
        return this._eth.accounts;
    }

    coinbase() {
        return this._eth.coinbase
    }

    getBalance(account, units = 'ether') {
        return this._web3.fromWei(this._eth.getBalance(account), units)
    }

    defaultAccount() {
        return this._eth.defaultAccount;
    }

    watch() {

    }
}


module.exports = Ethereum;