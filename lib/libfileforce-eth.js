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
            this.ethereum.registerNewFile(hash, config.eth.account)
        });

        this.on('IPFS#ADD#ECTAG', (hash, ecTag) => {
            this.ethereum.registerEcTag(hash, ecTag);
        });
    }

    watch(filter = {}, cb) {

    }

}

module.exports = FileForceEthereum;