/**
 * Created by ikonovalov on 24/11/16.
 */
"use strict";
const BigNumber = require('bignumber.js');
const FileForce = require('./libfileforce');
const Ethereum = require('./libethereum');
const multihash = require('multihashes');
const multihashConst = require('multihashes/lib/constants');

const fileForceABI = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"admins","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalDelegatedEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sha256Pref","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"disableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newAdmin","type":"address"}],"name":"addAdmin","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"enableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalFileAppeared","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfs","type":"uint256"},{"name":"owner","type":"address"},{"name":"party","type":"address"}],"name":"ecTagRegistered","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsHash","type":"uint256"}],"name":"newFileAppeared","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsOrigin","type":"uint256"},{"name":"ipfsNew","type":"uint256"},{"name":"fromAcc","type":"address"},{"name":"toAcc","type":"address"}],"name":"ecTagDelegated","outputs":[],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"},{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"party","type":"address"}],"name":"EcTagRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsOrigin","type":"uint256"},{"indexed":false,"name":"ipfsNew","type":"uint256"},{"indexed":false,"name":"fromAcc","type":"address"},{"indexed":false,"name":"toAcc","type":"address"}],"name":"EcTagDelegated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"}],"name":"NewFileAppeared","type":"event"}];

const SolidityFunction = require('web3/lib/web3/function');

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

String.prototype.lpad = function(padString, length) {
    let str = this;
    while (str.length < length)
        str = padString + str;
    return str;
};

var isLockedException = function (error) {
    return error.message == 'account is locked';
};

class FileForceEthereum extends FileForce {

    constructor(config) {
        super(config);
        this.ethereum = new Ethereum(config);
        let address = this.config.eth['mother-contract'];
        this.contract = new FileForceContract(this.ethereum.web3, fileForceABI, address);

        this.on('IPFS#ADD#FILE' , (hash) => {
            this.contract.registerNewFile(hash, config.eth.account)
        });

        this.on('IPFS#ADD#ECTAG', (hash, ecTag) => {
            this.contract.registerEcTag(hash, ecTag);
        });

        this.on('IPFS#DELEGATE#ECTAG', (hash, ecTag, newHash, newEcTag) => {
            this.contract.delegateEcTag(hash, ecTag, newHash, newEcTag);
        });
    }

    static get eventType() {
        return {
            NewFileAppeared: 'NewFileAppeared',
            EcTagRegistered: 'EcTagRegistered',
            EcTagDelegated: 'EcTagDelegated'
        }
    }

    watchEvents(eventType, eventFilter, blockFilter, cb) {
        this.contract.event(eventType).watch(eventFilter, blockFilter, cb);
    }

    static bnToMultihash58(hashPartBn, hashAlgorithm = 'sha2-256') {
        let mhCode = multihashConst.names[hashAlgorithm];
        let mhLength = multihashConst.defaultLengths[mhCode];
        let originHex = hashPartBn.toString(16).lpad("0", mhLength * 2);
        let originBuf = Buffer.from(originHex, 'hex');
        let origin = multihash.toB58String(multihash.encode(originBuf, hashAlgorithm));
        return origin;
    }

}

class FileForceContract {

    constructor(web3, abi, address) {
        this._web3 = web3;
        let contract = web3.eth.contract(abi);
        this.instance = contract.at(address);
        let mutationFunctions = fileForceABI.filter((e => e.type == 'function' && !e.constant));
        this.f_newFileAppeared = new SolidityFunction(this._eth, mutationFunctions.find(e => e.name === 'newFileAppeared') , address);
        this.f_ecTagRegistered = new SolidityFunction(this._eth, mutationFunctions.find(e => e.name === 'ecTagRegistered') , address);
        this.f_ecTagDelegated = new SolidityFunction(this._eth, mutationFunctions.find(e => e.name === 'ecTagDelegated') , address);
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
            let options = {
                from: fromAccount,
                gas: NEW_FILE_ADVERTISING_LIMIT
            };
            let tx = this.instance.newFileAppeared.sendTransaction(
                ipfsDigest,
                options
            );
            let data = this.f_newFileAppeared.toPayload([ipfsDigest, options]);
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
            let options = {
                from: txAccount,
                gas: EC_TAG_REG_LIMIT
            };
            let tx = this.instance.ecTagRegistered.sendTransaction(
                ipfsDigest,
                ecTag.ownerAddress,
                ecTag.partyAddress,
                options
            );
            let data = this.f_ecTagRegistered.toPayload([
                ipfsDigest,
                ecTag.ownerAddress,
                ecTag.partyAddress,
                options]);
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

module.exports = FileForceEthereum;