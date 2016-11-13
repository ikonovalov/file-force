/**
 * Created by ikonovalov on 01/11/16.
 */
const config = require('./lib/config');
const libcrypto = require('./lib/libcrypto');
const ask = require('./lib/libask');
const IPFS = require('./lib/libipfs');
const ipfs = new IPFS(config.ipfs.api);
const validator = require('validator');
const fs = require('fs');
const tmp = require('tmp');
const colors = require('colors');

const FileForce = require('./lib/libfileforce');

const fileForce = new FileForce(config);

module.exports = {

    /**
     * Add single (now) file.
     * @param path to file.
     */
    add: (path) => {
        console.log('Prepare ETH account');
        const account = ask.account();
        const password = ask.password();
        const selfKeyPair = fileForce.unlockKeys(account, password);
        fileForce.add(path, selfKeyPair, selfKeyPair.publicKey, (ecTag, ecTagHash) => {
            console.log(`ecTag location /ipfs/${ecTagHash}`);
        });
    },

    cat: (hash) => {
        fileForce.cat(hash, process.stdout);
    },

    ecTag: (ecTagHash) => {
        fileForce.ecTagByHash(ecTagHash, ecTag => {
           console.log(JSON.stringify(ecTag, null, 2));

            //----
            fileForce.decryptEcTag(ecTag, '0x7116673528278887d37038d93bd749b66110ec35', 'dlheu0', (error, rs) => {

            });

            //----
        });
    },

    decryptEcTag: (ecTagHash) => {

    }
};