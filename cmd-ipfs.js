/**
 * Created by ikonovalov on 01/11/16.
 */
const CONFIG_PATH =
    require('path').basename(__dirname) === 'bin' ?  '../config/app.yml' : './config/app.yml';
const config = require('yaml-config').readConfig(CONFIG_PATH);
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
           console.log(JSON.stringify(ecTag, null, 2))
        });
    }
};