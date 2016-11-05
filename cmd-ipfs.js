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
const colors = require('colors');
const stream = require('stream');

const ARROW = '\u2192';


function encryptFileTag(tag, callback, publicKey) {
    let tagJson = validator.isJSON(tag) ? tag : JSON.stringify(tag);
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
    let result = {
        publicKey: chosenPublic,
        hkdf: selfStrongKeyMaterial.hkdf,
        encryptedTag: encryptedTag
    };
    if (!callback) {
        return result;
    } else {
        callback(result);
    }

}

// TODO move to libipfs
function storeEncryptedTag(encryptedTag, addCallback) {
    var bufferStream = new stream.PassThrough();
    bufferStream.end(encryptedTag.cipherText);
    ipfs.add(bufferStream, addCallback);
}

module.exports = {

    /**
     * Add single (now) file.
     * @param path to file.
     */
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
                        console.log(`File added to IPFS. Tag: ${JSON.stringify(tag)}`);

                        encryptFileTag(tag, (encryptionResult) => {
                            storeEncryptedTag(encryptionResult.encryptedTag, (e, r) => {
                                let rb = r[0];
                                let tagHash = rb.hash;
                                console.log(`TAG#${tagHash} ${ARROW} FILE#${rootBlock.hash}`.red.bold);
                                let ethData = {
                                    destination: encryptionResult.publicKey,
                                    tag: {
                                        encrypted: true,
                                        algorithm: encryptionResult.encryptedTag.algorithm,
                                        iv: encryptionResult.encryptedTag.iv,
                                        ipfsHash: tagHash
                                    }
                                };
                                console.log(ethData);
                            });

                        });

                    } else {
                        console.error(error);
                    }
                });

            });
        });
    }
};