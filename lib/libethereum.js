/**
 * Created by ikonovalov on 27/10/16.
 */
const multihash = require('multihashes');
const BigNumber = require('bignumber.js');
const fileForceABI = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"admins","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalDelegatedEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sha256Pref","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"disableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newAdmin","type":"address"}],"name":"addAdmin","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"enableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalFileAppeared","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfs","type":"uint256"},{"name":"owner","type":"address"},{"name":"party","type":"address"}],"name":"ecTagRegistered","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsHash","type":"uint256"}],"name":"newFileAppeared","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsOrigin","type":"uint256"},{"name":"ipfsNew","type":"uint256"},{"name":"fromAcc","type":"address"},{"name":"toAcc","type":"address"}],"name":"ecTagDelegated","outputs":[],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"},{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"party","type":"address"}],"name":"EcTagRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsOrigin","type":"uint256"},{"indexed":false,"name":"ipfsNew","type":"uint256"},{"indexed":false,"name":"fromAcc","type":"address"},{"indexed":false,"name":"toAcc","type":"address"}],"name":"EcTagDelegated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"}],"name":"NewFileAppeared","type":"event"}];

const EC_TAG_REG_LIMIT = 1000000;

const EC_TAG_DELEGATE_LIMIT = 1000000;

const NEW_FILE_ADVERTISING_LIMIT = 1000000;

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
        this._defaultAccount = config.eth.account;
        this._web3.setProvider(new this._web3.providers.HttpProvider(config.eth.api));
        this._eth = this._web3.eth;

        let fileForceAddress = config.eth['mother-contract'];
        this._fileForceContract = new FileForceContract(this._web3, fileForceAddress, this._defaultAccount)
    }

    get fileForceContract() {
        return this._fileForceContract;
    }

    get lastBlock() {
        return this._eth.getBlock('latest')
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

}

var isLockedException = function (error) {
    return error.message == 'account is locked';
};


class FileForceContract {

    constructor(web3, address, txFromAccount) {
        this._web3 = web3;
        this._defaultAccount = txFromAccount;
        let contract = web3.eth.contract(fileForceABI);
        this.instance = contract.at(address);
    }

    event(eventName) {
        const eventPrototype = this.instance[eventName];
        return {
            watch: (eventFilter, blockFilter, cb) => {
                eventPrototype(eventFilter, blockFilter).watch(cb);
            },
            get: (eventFilter, blockFilter) => {
                return eventPrototype(eventFilter, blockFilter).get();
            }
        }
    }

    allEvents() {
        return {
            watch: (blockFilter, cb) => {
               return this.allEvents(blockFilter).watch(cb);
            },
            get: (eventFilter, blockFilter) => {
                return this.allEvents(eventFilter, blockFilter).get();
            }
        }
    }

    /**
     * Register new file hash in IPFS.
     * @param ipfsHash
     * @param fromAccount
     * @returns {*}
     */
    registerNewFile(ipfsHash, fromAccount) {
        let ipfsDigest = decodeToBN256(ipfsHash);
        unlock.call(this, fromAccount);
        try {
            let tx = this.instance.newFileAppeared.sendTransaction(
                ipfsDigest,
                {
                    from: this._defaultAccount,
                    gas: NEW_FILE_ADVERTISING_LIMIT
                }
            );
            return tx;
        } catch (error) {
            let accountLocked = isLockedException();
            if (accountLocked) {
                // todo Unlock account and retry
                console.error(`Account ${txAccount} is locked.`);
            }
        }
    }

    /**
     * Register IPFS hash and ecTag in Ethereum contract.
     * @param ipfsHashArr
     * @param ecTag
     * @returns {eth.tx}
     */
    registerEcTag(ipfsHash, ecTag) {
        let ipfsDigest = decodeToBN256(ipfsHash);
        let txAccount = ecTag.ownerAddress;
        unlock.call(this, txAccount);
        try {
            let tx = this.instance.ecTagRegistered.sendTransaction(
                ipfsDigest,
                ecTag.ownerAddress,
                ecTag.partyAddress,
                {
                    from: txAccount,
                    gas: EC_TAG_REG_LIMIT
                }
            );
            return tx;
        } catch (e) {
            let accountLocked = e.message == 'account is locked';
            if (accountLocked) {
                // todo Unlock account and retry
                console.error(`Account ${txAccount} is locked.`);
            }
            console.error(e);
            throw e;
        }
    }

    delegateEcTag(ipfsHash, ecTag, newIpfsHash, newEcTag) {
        let ipfsHashDigest = decodeToBN256(ipfsHash);
        let ipfsNewHashDigest = decodeToBN256(newIpfsHash);
        let fromAcc = newEcTag.ownerAddress;
        let toAcc = newEcTag.partyAddress;
        unlock.call(this, fromAcc);
        try {
            let tx = this.instance.ecTagDelegated.sendTransaction(
                ipfsHashDigest,
                ipfsNewHashDigest,
                fromAcc,
                toAcc,
                {
                    from: fromAcc,
                    gas: EC_TAG_DELEGATE_LIMIT
                }
            );
            return tx;
        } catch (e) {
            throw e;
        }
    }
}


module.exports = Ethereum;