/**
 * Created by ikonovalov on 24/11/16.
 */
"use strict";
const FileForce = require('./libfileforce');
const Ethereum = require('./libethereum');

class FileForceEthereum extends FileForce {

    constructor(config) {
        super(config);
        this.ethereum = new Ethereum(config);

        this.on('IPFS#ADD#FILE' , (hash) => {
            console.log(`====> File added ${hash}`)
        });

        this.on('IPFS#ADD#ECTAG', (hash, ecTag) => {
            console.log(`====> ecTag added ${hash}. Owner ${ecTag.ownerAddress}`)
        });
    }

    add(data, ownerKeyPair, destinationPublic, cb) {
        super.add(data, ownerKeyPair, destinationPublic, (error, result) => {
            if (!error) {
                this.ethereum.registerEcTag(result.hash, result.ecTag);

            }
            if (cb) {
                cb(error, result)
            }
        });
    }

    watch(filter = {}, cb) {

    }

}

module.exports = FileForceEthereum;