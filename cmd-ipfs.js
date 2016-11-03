/**
 * Created by ikonovalov on 01/11/16.
 */
const config = require('yaml-config').readConfig('./config/app.yml');
const account = require('./cmd-account');
const libcrypto = require('./lib/libcrypto');
const IPFS = require('./lib/libipfs');
const ipfs = new IPFS(config.ipfs.api);
const validator = require('validator');
const fs = require('fs');
const tmp = require('tmp');

function addOpCallback(algorithm, iv, secret, ipfsHash) {
    console.log(`algorithm: ${algorithm}, iv: ${iv}, secret: ${secret}, ipfs-hash: ${ipfsHash}`)
}


module.exports = {

    add: (path) => {
        let originalStream = fs.createReadStream(path);
        let onetimeKey = libcrypto.randomKey();

        tmp.file({prefix: 'force-'}, (err, tmpFilePath) => {
            if (err) throw err;

            const encryptedStream = fs.createWriteStream(tmpFilePath);

            libcrypto.encryptStream(originalStream, encryptedStream, onetimeKey, (encryptionParams) => {

                ipfs.add(tmpFilePath, (error, result) => {
                    if (!error) {
                        let rootBlock = result[0];
                        addOpCallback(
                            encryptionParams.algorithm,
                            encryptionParams.iv,
                            encryptionParams.secret,
                            rootBlock.hash
                        );

                    } else {
                        console.error(error);
                    }
                });

            });
        });
    }
};