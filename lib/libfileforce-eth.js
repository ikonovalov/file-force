/*
 *   Copyright (C) 2017 Igor Konovalov
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

/**
 * Created by ikonovalov on 24/11/16.
 */
"use strict";
const BigNumber = require('bignumber.js');
const FileForce = require('./libfileforce');
const Ethereum = require('./libethereum');
const multihash = require('multihashes');
const multihashConst = require('multihashes/src/constants');
const Tx = require('ethereumjs-tx');
const EthUtil = require('ethereumjs-util');

const fileForceABI = [{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"admins","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalDelegatedEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"sha256Pref","outputs":[{"name":"","type":"uint16"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"disableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"newAdmin","type":"address"}],"name":"addAdmin","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"enableHashBroadcasting","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalFileAppeared","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfs","type":"uint256"},{"name":"owner","type":"address"},{"name":"party","type":"address"}],"name":"ecTagRegistered","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalEcTags","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsHash","type":"uint256"}],"name":"newFileAppeared","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"ipfsOrigin","type":"uint256"},{"name":"ipfsNew","type":"uint256"},{"name":"fromAcc","type":"address"},{"name":"toAcc","type":"address"}],"name":"ecTagDelegated","outputs":[],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"},{"indexed":false,"name":"owner","type":"address"},{"indexed":false,"name":"party","type":"address"}],"name":"EcTagRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfsOrigin","type":"uint256"},{"indexed":false,"name":"ipfsNew","type":"uint256"},{"indexed":false,"name":"fromAcc","type":"address"},{"indexed":false,"name":"toAcc","type":"address"}],"name":"EcTagDelegated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"ipfs","type":"uint256"}],"name":"NewFileAppeared","type":"event"}];

const SolidityFunction = require('web3/lib/web3/function');

const EC_TAG_REG_LIMIT = 150000;

const EC_TAG_DELEGATE_LIMIT = 150000;

const NEW_FILE_ADVERTISING_LIMIT = 150000;

function decodeToBN256(hash) {
    let ipfsHashArr = multihash.fromB58String(hash);
    let ipfsHashDec = multihash.decode(ipfsHashArr);
    let ipfsDigest = new BigNumber('0x' + ipfsHashDec.digest.toString('hex'));
    return ipfsDigest;
}


String.prototype.lpad = function(padString, length) {
    let str = this;
    while (str.length < length)
        str = padString + str;
    return str;
};

class FileForceEthereum extends FileForce {

    constructor(config) {
        super(config);
        this.advertisingLevel = config.ipfs['advertising-level'] || 'low';
        this._ethereum = new Ethereum(config);
        let address = this.config.eth['mother-contract'];
        this.contract = new FileForceContract(
            this._ethereum,
            fileForceABI,
            address
        );

        switch (this.advertisingLevel) {
            case 'high': {
                this.on('IPFS#ADD#FILE' , (hash, account) => {
                    let keys = this.unlockKeys(account); // assume they are unlocked already.
                    this.contract.registerNewFile(hash, account, keys);
                });
            }
            case 'medium': {
                this.on('IPFS#ADD#ECTAG', (hash, ecTag) => {
                    let keys = this.unlockKeys(ecTag.ownerAddress);
                    this.contract.registerEcTag(hash, ecTag, keys);
                });
            }
            case 'low': {
                this.on('IPFS#DELEGATE#ECTAG', (hash, ecTag, newHash, newEcTag) => {
                    let keys = this.unlockKeys(newEcTag.ownerAddress);
                    this.contract.delegateEcTag(hash, ecTag, newHash, newEcTag, keys);
                });
            }
        }
    }

    get ethereum() {
        return this._ethereum;
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

    // TODO: Move somewhere. Not here!
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

    constructor(ethereum, abi, address) {
        this._ethereum = ethereum;

        let contract = this._ethereum.web3.eth.contract(abi);
        this.instance = contract.at(address);

        let mutationFunctions = abi.filter((e => e.type == 'function' && !e.constant));
        this.f_newFileAppeared = new SolidityFunction(this._ethereum.eth, mutationFunctions.find(e => e.name === 'newFileAppeared') , address);
        this.f_ecTagRegistered = new SolidityFunction(this._ethereum.eth, mutationFunctions.find(e => e.name === 'ecTagRegistered') , address);
        this.f_ecTagDelegated = new SolidityFunction(this._ethereum.eth, mutationFunctions.find(e => e.name === 'ecTagDelegated') , address);
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
    registerNewFile(ipfsHash, account , keys) {
        let ipfsDigest = decodeToBN256(ipfsHash);
        let dataStructure = this.f_newFileAppeared.toPayload([ipfsDigest]);

        let rawTx = {
            nonce: this._ethereum.txCountWithPending(account),
            gasPrice: EthUtil.intToHex(this._ethereum.gasPrice),
            gasLimit: EthUtil.intToHex(NEW_FILE_ADVERTISING_LIMIT),
            to: dataStructure.to,
            value: '0x00',
            data: dataStructure.data
        };

        let tx = new Tx(rawTx);
        tx.sign(keys.privateKey);
        let serializedTx = tx.serialize();

        let txHash = this._ethereum.sendRawTransaction(EthUtil.addHexPrefix(serializedTx.toString('hex')));
        return txHash;
    }

    /**
     * Register IPFS hash and ecTag in Ethereum contract.
     * @param ipfsHashArr
     * @param ecTag
     * @returns {eth.tx}
     */
    registerEcTag(ipfsHash, ecTag, keys) {
        let ipfsDigest = decodeToBN256(ipfsHash);
        let account = ecTag.ownerAddress;
        let dataStructure = this.f_ecTagRegistered.toPayload(
            [
                ipfsDigest,
                ecTag.ownerAddress,
                ecTag.partyAddress,
            ]
        );

        let rawTx = {
            nonce: this._ethereum.txCountWithPending(account),
            gasPrice: EthUtil.intToHex(this._ethereum.gasPrice),
            gasLimit: EthUtil.intToHex(EC_TAG_REG_LIMIT),
            to: dataStructure.to,
            value: '0x00',
            data: dataStructure.data
        };
        let tx = new Tx(rawTx);
        tx.sign(keys.privateKey);
        let serializedTx = tx.serialize();

        let txHash = this._ethereum.sendRawTransaction(EthUtil.addHexPrefix(serializedTx.toString('hex')));

        return txHash;
    }

    delegateEcTag(ipfsHash, ecTag, newIpfsHash, newEcTag, keys) {
        let ipfsHashDigest = decodeToBN256(ipfsHash);
        let ipfsNewHashDigest = decodeToBN256(newIpfsHash);
        let fromAcc = newEcTag.ownerAddress;
        let toAcc = newEcTag.partyAddress;

        let dataStructure = this.f_ecTagDelegated.toPayload(
            [
                ipfsHashDigest,
                ipfsNewHashDigest,
                fromAcc,
                toAcc
            ]
        );

        let rawTx = {
            nonce: this._ethereum.txCountWithPending(fromAcc),
            gasPrice: EthUtil.intToHex(this._ethereum.gasPrice),
            gasLimit: EthUtil.intToHex(EC_TAG_DELEGATE_LIMIT),
            to: dataStructure.to,
            value: '0x00',
            data: dataStructure.data
        };

        let tx = new Tx(rawTx);
        tx.sign(keys.privateKey);
        let serializedTx = tx.serialize();
        let txHash = this._ethereum.sendRawTransaction(EthUtil.addHexPrefix(serializedTx.toString('hex')));

        return txHash;
    }
}

module.exports = FileForceEthereum;