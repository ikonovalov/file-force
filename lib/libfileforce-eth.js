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
            this.ethereum.fileForceContract.registerNewFile(hash, config.eth.account)
        });

        this.on('IPFS#ADD#ECTAG', (hash, ecTag) => {
            this.ethereum.fileForceContract.registerEcTag(hash, ecTag);
        });
    }

    watch(filter = {}, cb) {
        this.ethereum.watch()
    }

}

module.exports = FileForceEthereum;