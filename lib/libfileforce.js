"use strict";

const IPFS = require('./libipfs');
const libcrypto = require('./libcrypto');
const fs = require('fs');
const tmp = require('tmp');

class FileForce {

    constructor(config) {
        this.config = config;
        this.ipfs = new IPFS(this.config.ipfs.api);
        this.accountToKeys = new Map();
    }

    unlockKeys(account, password) {
        if (this.accountToKeys.has(account)) {
            return this.accountToKeys.get(account);
        } else {
            let keyPair = libcrypto.keyPair(this.config.eth.datadir, account, password);
            this.accountToKeys.set(account, keyPair);
            return keyPair;
        }
    }

    isAccountLocked(account) {
        return !this.accountToKeys.has(account);
    }

    add(path) {
        let originalStream = fs.createReadStream(path);
        let onetimeKey = libcrypto.randomKey();

        tmp.file({prefix: 'force-'}, (err, tmpFilePath) => {
            if (err) throw err;

            const encryptedStream = fs.createWriteStream(tmpFilePath);

            libcrypto.encryptStream(originalStream, encryptedStream, onetimeKey, (encryptionParams) => {

                this.ipfs.add(tmpFilePath, (error, result) => {
                    if (!error) {
                        let rootBlock = result[0];

                        let tag = {
                            algorithm: encryptionParams.algorithm,
                            iv: encryptionParams.iv,
                            secret: onetimeKey.toString('hex'),
                            ipfsHash: rootBlock.hash,
                            ipfsHashSign: libcrypto.sign(rootBlock.hash, selfKeyPair.privateKey).toString('base64')
                        };

                        console.log('File added to IPFS with tag:');
                        console.log(`${JSON.stringify(tag, null, 2)}`.blue);

                        console.log(`Encrypting tag with ECDH using AES...`);

                        encryptFileTag(tag, null, (tagEncryptionResult) => {

                                let ownerAddress = libcrypto.publicToAddress(tagEncryptionResult.ownerPubKey);
                                let partyAddress = libcrypto.publicToAddress(tagEncryptionResult.destPubKey);
                                let encryptedSymmetricTag = tagEncryptionResult.encryptedTag.cipherText.toString('base64');
                                let ownerPublicKey = '0x' + tagEncryptionResult.ownerPubKey.toString('hex');
                                let hkdf = tagEncryptionResult.hkdf;
                                let symmetricAlgorithm = tagEncryptionResult.encryptedTag.algorithm;
                                let symmetricIv = tagEncryptionResult.encryptedTag.iv;

                                let ecTag = {
                                    ownerAddress: ownerAddress,
                                    partyAddress: partyAddress,
                                    tag: encryptedSymmetricTag,
                                    tagEncryption: {
                                        protocol: 'ECDH',
                                        ownerPublicKey: ownerPublicKey,
                                        kdf: {
                                            name: 'hkdf',
                                            params: hkdf,
                                        },
                                        encryption: {
                                            algorithm: symmetricAlgorithm,
                                            iv: symmetricIv
                                        }
                                    },
                                };

                                let ecTagJson = JSON.stringify(ecTag);

                                ipfs.addBuffer(Buffer.from(ecTagJson, 'utf8'), (e, r) => {
                                    let rb = r[0];
                                    let ecTagHash = rb.hash;
                                    console.log('ecTag stored in IPFS');
                                    console.log(`ecTag ${ecTagHash} ${ARROW} File ${rootBlock.hash}`.red.bold);
                                });
                            }
                        );

                    } else {
                        console.error(error);
                    }
                });

            });
        });
    }
}

module.exports = FileForce;