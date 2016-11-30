/**
 * Created by ikonovalov on 24/11/16.
 */
"use strict";
const FileForce = require('./libfileforce');
const Ethereum = require('./libethereum');
const multihash = require('multihashes');

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

    static eventToIPFSHash(hashPartBn, hashAlgorithm = 'sha2-256') {
        let originHex = hashPartBn.toString(16);
        let originBuf = Buffer.from(originHex, 'hex');
        let origin = multihash.toB58String(multihash.encode(originBuf, hashAlgorithm));
        return origin;
    }

}

module.exports = FileForceEthereum;