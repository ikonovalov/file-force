/**
 * Created by ikonovalov on 24/11/16.
 */
"use strict";
const FileForce = require('./libfileforce');
const Ethereum = require('./libethereum');
const multihash = require('multihashes');
const multihashConst = require('multihashes/lib/constants');

function padZeros(s, size) {
    while (s.length < size) s = "0" + s;
    return s;
}

String.prototype.lpad = function(padString, length) {
    let str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}

class FileForceEthereum extends FileForce {

    constructor(config) {
        super(config);
        this.ethereum = new Ethereum(config);

        this.on('IPFS#ADD#FILE' , (hash) => {
            this.ethereum.fileForceContract.registerNewFile(hash, config.eth.account)
        });

        this.on('IPFS#ADD#ECTAG', (hash, ecTag) => {
            this.ethereum.fileForceContract.registerEcTag(hash, ecTag);
        });

        this.on('IPFS#DELEGATE#ECTAG', (hash, ecTag, newHash, newEcTag) => {
            this.ethereum.fileForceContract.delegateEcTag(hash, ecTag, newHash, newEcTag);
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
        this.ethereum.fileForceContract.event(eventType).watch(eventFilter, blockFilter, cb);
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

module.exports = FileForceEthereum;