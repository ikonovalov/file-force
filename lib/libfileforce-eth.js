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

}

module.exports = FileForceEthereum;