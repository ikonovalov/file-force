/**
 * Created by ikonovalov on 01/11/16.
 */
const config = require('yaml-config').readConfig('./config/app.yml');
const libcrypto = require('./lib/libcrypto');
const ask = require('./lib/libask');
const IPFS = require('./lib/libipfs');
const ipfs = new IPFS(config.ipfs.api);
const validator = require('validator');
const fs = require('fs');
const tmp = require('tmp');



function encryptFileTag(tag, publicKey) {
    console.log(`File added to IPFS. Hash: ${tag.ipfsHash}`);
    let tagJson = JSON.stringify(tag);
    let account = ask.account();
    let password = ask.password();
    let selfKeyPair = libcrypto.keyPair(config.eth.datadir, account, password);
    let chosenPublic;
    if (!publicKey) {
        chosenPublic = selfKeyPair.publicKey;
        console.log('Using loopback file tag encryption (self public).');
    } else {
        chosenPublic = publicKey;
    }
    let selfSharedKey = libcrypto.deriveSharedKey(selfKeyPair.privateKey, chosenPublic);
    let selfStrongKeyMaterial = libcrypto.deriveSecretKey(selfSharedKey);
    let encryptedTag = libcrypto.encrypt(tagJson, selfStrongKeyMaterial.key);
    console.log(encryptedTag);
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
                        let tag = {
                            algorithm: encryptionParams.algorithm,
                            iv: encryptionParams.iv,
                            secret: encryptionParams.secret,
                            ipfsHash: rootBlock.hash
                        };
                        encryptFileTag(tag);

                    } else {
                        console.error(error);
                    }
                });

            });
        });
    }
};