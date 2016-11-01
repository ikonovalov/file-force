/**
 * Created by ikonovalov on 01/11/16.
 */
const config = require('yaml-config').readConfig('./config/app.yml');
const account = require('./cmd-account');
const libcrypto = require('./lib/libcrypto');
const IPFS = require('./lib/libipfs');
const ipfs = new IPFS(config.ipfs.api);
const colors = require('colors');
const validator = require('validator');
const fs = require('fs');

module.exports = {

    add: (path) => {
        let stream = fs.createReadStream(path);
        let onetimeKey = libcrypto.randomKey();
        let encFilePath = '/tmp/file.enc';
        let encryptedStream = fs.createWriteStream(encFilePath);

        libcrypto.encryptStream(stream, encryptedStream, onetimeKey, encryptionResult => {

        });

        ipfs.add(path, (error, result) => {
            if (!error) {
                result.forEach(rootBlock => {
                    console.log(`${rootBlock.path}  -> ${rootBlock.hash}`);
                })
            } else {
                console.error(error);
            }
        });
    },
};