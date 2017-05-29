"use strict";

const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const stream = require('stream');
const multihash = require('multihashes');
const EventEmitter = require('events');

const IPFS = require('./libipfs');
const libcrypto = require('./libcrypto');
const BN = require('bn.js');
const ethUtils = require('ethereumjs-util');

const ARROW = '\u2192';

const isStream = (stream) => {
    return typeof stream === 'object' && typeof stream.pipe === 'function';
};

const isJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (error) {
        return false;
    }
};

const streamify = (json) => {
    const streamifier = require('streamifier/lib');
    return streamifier.createReadStream(json);
};

const buildEcTag = (ownerAddress, partyAddress, encryptedSymmetricTag, ownerPublicKey, hkdf, symmetricAlgorithm, symmetricIv, metadata) => {
    let ecTag = {
        ownerAddress: ownerAddress,
        partyAddress: partyAddress,
        tag: encryptedSymmetricTag,
        metadata: metadata || {},
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
};

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

const prepareMetadata = function (options, data) {
    if (options.source === 'path') {
        options.metadata.filename = path.basename(data);
    }
    return options.metadata;
};

class FileForce extends EventEmitter {

    constructor(config, memKeys) {
        super();
        this.config = config;
        this.ipfs = new IPFS(config);

        // adjustable in-memory key store
        if (!memKeys) {
            let MemKeys = require('./memkeys').withTimeout;
            this.memKeys = new MemKeys(this.config.eth.datadir);
        } else {
            this.memKeys = memKeys;
        }
    }


    unlockKeys(account, password) {
        return this.memKeys.unlockKeys(account, password);
    }

    /**
     * Check is account unlocked already.
     * @param account
     * @returns {boolean}
     */
    isAccountLocked(account) {
        return this.memKeys.isAccountLocked(account);
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
     * @param data
     * @param ownerKeyPair
     * @param destinationPublic
     * @param options
     * @return {Promise<{
                    ecTag: ecTag,
                    hash: ecTagHash
                }>}
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
        let originalStream =
            options.source === 'stream' ? data :
            options.source === 'json' ? streamify(data) :
                /* else */ fs.createReadStream(data);

        if (!options.metadata.mimeType) {
            options.metadata.mimeType = determinateMimeType(originalStream, options);
        }

        let metadata = prepareMetadata(options, data);

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
                                    .catch(error => {
                                        console.log(error);
                                        throw error;
                                    })
                            });

                        })
                        .then(fileStoreResult => {
                            let rootBlock = fileStoreResult.addResults[0];
                            let encryptionParams = fileStoreResult.encryptionParam;

                            let ipfsHash = rootBlock.hash;

                            let mHashArray = multihash.fromB58String(ipfsHash); // it still include first 2 bytes for a schema
                            let signature = libcrypto.sign(mHashArray, ownerKeyPair.privateKey);
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
                            return buildEcTag(
                                ownerAddress,
                                partyAddress,
                                encryptedSymmetricTag,
                                ownerPublicKey,
                                hkdf,
                                symmetricAlgorithm,
                                symmetricIv,
                                metadata
                            );
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
     * @return Promise (ecTag)
     */
    ecTagByHash(hash) {
        return new Promise(resolve => {
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
                        resolve(JSON.parse(combined.toString()));
                    })
                });
            });
        });
    }

    verifyByTag(tag, providedPublicKey) {
        return new Promise((resolve, reject) => {
            try {
                let signature = {
                    r: new BN(tag.signature.r, 16),
                    s: new BN(tag.signature.s, 16),
                    recoveryParam: tag.signature.v
                };
                let message = multihash.fromB58String(tag.ipfs);

                if (!providedPublicKey) {
                    let recoveredPublicKey = libcrypto.recovery(signature, message);
                    let recoveredAddress = libcrypto.publicToAddress(recoveredPublicKey);
                    let signatureValidation = libcrypto.verify(signature, message, recoveredPublicKey);
                    resolve({
                        authorPublicKey: ethUtils.bufferToHex(Buffer.from(recoveredPublicKey)),
                        authorAddress: recoveredAddress,
                        signature: tag.signature,
                        digest: tag.ipfs,
                        validationResult: signatureValidation,
                        tag: tag
                    });
                } else {
                    let derivedAddress = libcrypto.publicToAddress(providedPublicKey);
                    let signatureValidation = libcrypto.verify(signature, message, providedPublicKey);
                    resolve({
                        authorPublicKey: ethUtils.bufferToHex(Buffer.from(providedPublicKey)),
                        authorAddress: derivedAddress,
                        signature: tag.signature,
                        digest: tag.ipfs,
                        validationResult: signatureValidation,
                        tag: tag
                    });
                }

            } catch (e) {
                reject(e);
            }
        })
    }

    /**
     *
     * @param ecTag object
     * @param ownerKeyPair - pair of public and private keys {privateKey, publicKey}
     * @return Promise (tag)
     */
    decryptEcTag(ecTag, ownerKeyPair) {
        return new Promise((resolve, reject) => {
            let tag;
            if (ecTag.partyAddress !== libcrypto.publicToAddress(ownerKeyPair.publicKey)) {
                reject(new Error(`Passed wrong account. ecTag has party account ${ecTag.partyAddress}`))
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

                resolve(tag);
            }
        });

    }

    /**
     * Decrypt tag's content
     * @param tag
     * @param destinationStream
     * @param cb
     */
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

    /**
     *
     * @param ecTagHash
     * @param ownerKeyPair
     * @param anotherPublicKey
     * @return {Promise<{
                    ecTag: ecTag,
                    hash: ecTagHash
                }>}
     */
    delegateTag(ecTagHash, ownerKeyPair, anotherPublicKey) {
        return new Promise(resolve => {
                anotherPublicKey = Buffer.from(anotherPublicKey, 'hex');
                let ecTag;
                this
                    .ecTagByHash(ecTagHash)
                    .then(_ecTag => {
                        ecTag = _ecTag;
                        return this.decryptEcTag(ecTag, ownerKeyPair)
                    })
                    .then((tag) => {
                        return libcrypto.encryptObjectForParty(tag, ownerKeyPair, anotherPublicKey)
                    })
                    .then(tagEncryptionResult => {
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
                            symmetricIv,
                            ecTag.metadata
                        );
                        return this.storeEcTag(newEcTag)
                    })
                    .then(storeResult => {
                        this.emit('IPFS#DELEGATE#ECTAG', ecTagHash, ecTag, storeResult.hash, storeResult.ecTag);
                        resolve(storeResult)
                    });
            }
        );

    }

    /**
     * Store ecTag in IPFS.
     * @param ecTag
     * @return {*|Promise.<{
                    ecTag: ecTag,
                    hash: ecTagHash
                }>}
     */
    storeEcTag(ecTag) {
        let ecTagJson = JSON.stringify(ecTag);
        return this.ipfs
            .addBuffer(Buffer.from(ecTagJson, 'utf8'))
            .then(blocks => {
                let block = blocks[0];
                let ecTagHash = block.hash;
                return {
                    ecTag: ecTag,
                    hash: ecTagHash
                }
            });
    }
}
module.exports = FileForce;