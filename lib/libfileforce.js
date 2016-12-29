"use strict";

const fs = require('fs');
const tmp = require('tmp');
const stream = require('stream');
const multihash = require('multihashes');
const EventEmitter = require('events');

const IPFS = require('./libipfs');
const libcrypto = require('./libcrypto');

const ARROW = '\u2192';

const isStream = (stream) => {
    return typeof stream === 'object' && typeof stream.pipe === 'function';
}

const isJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (error) {
        return false;
    }
}

const streamify = (json) => {
    const streamifier = require('streamifier/lib');
    return streamifier.createReadStream(json);
}

const buildEcTag = (ownerAddress, partyAddress, encryptedSymmetricTag, ownerPublicKey, hkdf, symmetricAlgorithm, symmetricIv) => {
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
    return ecTag;
}

const determinateContentSource = (data) => {
    return isStream(data) ? 'stream' : isJSON(data) ? 'json' : 'path';
};

const determinateMimeType = (data, options) => {
    switch (options.source) {
        case 'json': {
            return 'application/json';
        }
        case 'path': {

        }
        case 'stream': {
            return 'application/octet-stream';
        }
    }

};

const prepareMetadata = function (options) {
    return options.metadata;
};

class FileForce extends EventEmitter {

    constructor(config) {
        super();
        this.config = config;
        this.ipfs = new IPFS(config);
        this.accountToKeys = new Map();
    }

    /**
     * Unlock and cache key pair.
     * @param account
     * @param password
     * @returns {KeyPair}
     */
    unlockKeys(account, password) {
        if (this.isAccountLocked(account)) {
            let keyPair = libcrypto.keyPair(this.config.eth.datadir, account, password);
            this.accountToKeys.set(account, keyPair);
            return keyPair;
        } else {
            return this.accountToKeys.get(account);
        }
    }

    /**
     * Check is account unlocked already.
     * @param account
     * @returns {boolean}
     */
    isAccountLocked(account) {
        return !this.accountToKeys.has(account);
    }

    /**
     * Add file/stream/JSON to IPFS.
     * Emitted events:
     *  IPFS#ADD#FILE,
     *  IPFS#ADD#ECTAG
     *
     * Stage 1. Encrypt and sing original file and put it to a IPFS => got Tag (for everyone)
     * Stage 2. Encrypt Tag with ECDH + hKDF + AES => got ecTag (personal use).
     * @param data {Stream | path | JSON}
     * @param ownerKeyPair - pair of 256 bits private key and 512bits public key with 1 byte preffix (0x04 in this case).
     * @param destinationPublic
     * @param [options]
     *  {
     *      source: 'json' | 'stream' | 'path'  // determinates data's source
     *      metadata: { // passed to tag AS-IS! Be aware!
     *          mimeType 'application/json' // and so...
     *      }
     *  }
     * @param [cb(error, result)]
     */
    add(data, ownerKeyPair, destinationPublic, options = {}) {

        // prepare input
        if (!options.metadata) {
            options.metadata = {};
        }

        if (!options.source) {
            let source = determinateContentSource(data, options);
            options.source = source;
        }
        let originalStream = options.source === 'stream' ? data :
            options.source === 'json' ? streamify(data) :
                /* else */ fs.createReadStream(data);

        if (!options.metadata.mimeType) {
            options.metadata.mimeType = determinateMimeType(originalStream, options);
        }

        // generate one-time password
        let onetimeKey = libcrypto.randomKey();

        return new Promise((resolve, reject) => {
            tmp.file({prefix: 'force-'}, (err, tmpFilePath) => {
                    if (err) throw err;

                    let encryptedStream = fs.createWriteStream(tmpFilePath);
                    libcrypto
                        .encryptStream(originalStream, encryptedStream, onetimeKey)
                        .then((encryptedStreamParams) => {
                            return new Promise(resolve => {
                                this.ipfs
                                    .add(tmpFilePath)
                                    .then(addResult => {
                                        resolve({
                                            addResults: addResult,
                                            encryptionParam: encryptedStreamParams
                                        })
                                    })
                            });

                        })
                        .then(fileStoreResult => {
                            let rootBlock = fileStoreResult.addResults[0];
                            let encryptionParams = fileStoreResult.encryptionParam;

                            let ipfsHash = rootBlock.hash;

                            let mHashArray = multihash.fromB58String(ipfsHash); // it still include first 2 bytes for a schema
                            let signature = libcrypto.sign(mHashArray, ownerKeyPair.privateKey);
                            let metadata = prepareMetadata(options);

                            let tag = {
                                algorithm: encryptionParams.algorithm,
                                iv: encryptionParams.iv,
                                secret: onetimeKey.toString('hex'),
                                ipfs: ipfsHash,
                                metadata: metadata,
                                signature: {
                                    v: signature.recoveryParam,
                                    r: signature.r.toString('hex'),
                                    s: signature.s.toString('hex')
                                }
                            };

                            let address = libcrypto.publicToAddress(ownerKeyPair.publicKey);
                            this.emit('IPFS#ADD#FILE', ipfsHash, address);
                            return libcrypto.encryptObjectForParty(tag, ownerKeyPair, !destinationPublic ? ownerKeyPair.publicKey : destinationPublic)
                        })
                        .then(tagEncryptionResult => {

                            let ownerAddress = libcrypto.publicToAddress(tagEncryptionResult.ownerPubKey);
                            let partyAddress = libcrypto.publicToAddress(tagEncryptionResult.destPubKey);
                            let encryptedSymmetricTag = tagEncryptionResult.encryptedTag.cipherText.toString('base64');
                            let ownerPublicKey = '0x' + tagEncryptionResult.ownerPubKey.toString('hex');
                            let hkdf = tagEncryptionResult.hkdf;
                            let symmetricAlgorithm = tagEncryptionResult.encryptedTag.algorithm;
                            let symmetricIv = tagEncryptionResult.encryptedTag.iv;
                            let ecTag = buildEcTag(
                                ownerAddress,
                                partyAddress,
                                encryptedSymmetricTag,
                                ownerPublicKey,
                                hkdf,
                                symmetricAlgorithm,
                                symmetricIv
                            );
                            return ecTag;
                        })
                        .then(ecTag => {
                            return this.storeEcTag(ecTag)

                        })
                        .then(ecTagStoreResult => {
                            this.emit('IPFS#ADD#ECTAG', ecTagStoreResult.hash, ecTagStoreResult.ecTag);
                            resolve(ecTagStoreResult)
                        })
                        .catch(storeError => {
                            reject(storeError);
                        });
                }
            );
        });
    };

    cat(hash, destinationStream) {
        this.ipfs.get(hash, (error, stream) => {
            stream.on('data', data => {
                data.content.pipe(destinationStream);
            });
        });
    }

    /**
     * Request ecTag object by IPFS hash.
     * @param hash
     * @param cb - cb(error, ecTag object)
     */
    ecTagByHash(hash, cb) {
        const buffers = [];
        this.ipfs.get(hash, (error, stream) => {
            if (error) {
                console.error(error);
                return;
            }
            stream.on('data', data => {
                let content = data.content;
                content.on('data', chunk => {
                    buffers.push(chunk);
                });
                content.on('end', () => {
                    let combined = Buffer.concat(buffers);
                    cb(null, JSON.parse(combined.toString()));
                })
            });
        });
    }

    /**
     *
     * @param ecTag
     * @param account
     * @param password
     * @param cb
     */
    decryptEcTag(ecTag, ownerKeyPair, cb) {
        let tag;
        if (ecTag.partyAddress !== libcrypto.publicToAddress(ownerKeyPair.publicKey)) {
            cb(new Error(`Passed wrong account. ecTag has party account ${ecTag.partyAddress}`))
        } else {

            let weakECDHAgreementKey = libcrypto.deriveSharedKey(
                ownerKeyPair.privateKey,
                Buffer.from(ecTag.tagEncryption.ownerPublicKey.slice(2), 'hex')
            );

            if (ecTag.tagEncryption.kdf.name == 'hkdf') {
                let strongKeyMaterial = libcrypto.deriveSecretKey(
                    weakECDHAgreementKey, ecTag.tagEncryption.kdf.params
                );

                let tagBuffer = libcrypto.decrypt(
                    ecTag.tag,
                    strongKeyMaterial.key,
                    {
                        algorithm: ecTag.tagEncryption.encryption.algorithm,
                        iv: Buffer.from(ecTag.tagEncryption.encryption.iv, 'hex')
                    }
                );
                tag = JSON.parse(tagBuffer.toString());
            } else {
                throw new Error(`Unsupported KDF function ${ecTag.tagEncryption.kdf.name}`)
            }

            if (cb) {
                cb(null, tag);
            }
        }
    }

    decryptByTag(tag, destinationStream, cb) {
        let ipfsLocation = tag.ipfs;
        this.ipfs.cat(ipfsLocation,
            // get ipfs cat stream
            (error, ipfsStream) => {
                if (error) {
                    console.error(error);
                    return;
                }
                // decrypt incoming stream and pass out
                libcrypto.decryptStream(
                    ipfsStream,
                    destinationStream,
                    Buffer.from(tag.secret, 'hex'),
                    cb,
                    {
                        algorithm: tag.algorithm,
                        iv: Buffer.from(tag.iv, 'hex')
                    }
                );

            });
    }

    delegateTag(ecTagHash, ownerKeyPair, anotherPublicKey, cb) {
        anotherPublicKey = Buffer.from(anotherPublicKey, 'hex');
        this.ecTagByHash(ecTagHash, (errorEcTag, ecTag) => {
            if (!errorEcTag) {
                this.decryptEcTag(ecTag, ownerKeyPair, (errorDecryptEc, tag) => {
                    if (!errorDecryptEc) {
                        libcrypto.encryptObjectForParty(
                            tag,
                            ownerKeyPair,
                            anotherPublicKey,
                            (tagEncryptionResult) => {

                                let ownerAddress = libcrypto.publicToAddress(tagEncryptionResult.ownerPubKey);
                                let partyAddress = libcrypto.publicToAddress(tagEncryptionResult.destPubKey);
                                let encryptedSymmetricTag = tagEncryptionResult.encryptedTag.cipherText.toString('base64');
                                let ownerPublicKey = '0x' + tagEncryptionResult.ownerPubKey.toString('hex');
                                let hkdf = tagEncryptionResult.hkdf;
                                let symmetricAlgorithm = tagEncryptionResult.encryptedTag.algorithm;
                                let symmetricIv = tagEncryptionResult.encryptedTag.iv;

                                const newEcTag = buildEcTag(
                                    ownerAddress,
                                    partyAddress,
                                    encryptedSymmetricTag,
                                    ownerPublicKey,
                                    hkdf,
                                    symmetricAlgorithm,
                                    symmetricIv
                                );
                                this.storeEcTag(newEcTag, (storeError, storeResult) => {
                                    if (!storeError) {
                                        this.emit('IPFS#DELEGATE#ECTAG', ecTagHash, ecTag, storeResult.hash, storeResult.ecTag);
                                        if (cb) {
                                            cb(storeError, storeResult)
                                        }
                                    } else
                                        throw storeError;
                                });
                            }
                        );

                    } else
                        console.error(errorDecryptEc)
                });
            } else
                console.error(errorEcTag)
        });
    }

    /**
     * Store ecTag in IPFS.
     * @param ecTag
     * @param cb(error, {ecTag, hash})
     */
    storeEcTag(ecTag, cb) {
        let ecTagJson = JSON.stringify(ecTag);
        return new Promise((resolve, reject) => {
            this.ipfs.addBuffer(Buffer.from(ecTagJson, 'utf8'))
                .then(r => {
                    let rb = r[0];
                    let ecTagHash = rb.hash;
                    resolve(
                        {
                            ecTag: ecTag,
                            hash: ecTagHash
                        }
                    );
                });
        });
    }
}
module.exports = FileForce;