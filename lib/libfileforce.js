"use strict";

const IPFS = require('./libipfs');
const libcrypto = require('./libcrypto');
const fs = require('fs');
const tmp = require('tmp');
const stream = require('stream');
const multihash = require('multihashes');
const EventEmitter = require('events');

const ARROW = '\u2192';

function isStream(stream) {
    return typeof stream === 'object' && typeof stream.pipe === 'function';
};

function buildEcTag(ownerAddress, partyAddress, encryptedSymmetricTag, ownerPublicKey, hkdf, symmetricAlgorithm, symmetricIv) {
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
class FileForce extends EventEmitter {

    constructor(config) {
        super();
        this.config = config;
        this.ipfs = new IPFS(this.config.ipfs.api);
        this.accountToKeys = new Map();
    }

    /**
     *
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

    isAccountLocked(account) {
        return !this.accountToKeys.has(account);
    }

    /**
     * Add file to IPFS.
     * Stage 1. Encrypt and sing original file and put it to a IPFS => got Tag (for everyone)
     * Stage 2. Encrypt Tag with ECDH + hKDF + AES => got ecTag (personal use).
     * @param data
     * @param ownerKeyPair
     * @param destinationPublic
     */
    add(data, ownerKeyPair, destinationPublic, cb) {

        let originalStream = isStream(data) ? data : fs.createReadStream(data);
        let onetimeKey = libcrypto.randomKey();

        tmp.file({prefix: 'force-'}, (err, tmpFilePath) => {
            if (err) throw err;

            const encryptedStream = fs.createWriteStream(tmpFilePath);

            libcrypto.encryptStream(originalStream, encryptedStream, onetimeKey, (encryptionParams) => {

                this.ipfs.add(tmpFilePath, (error, result) => {
                    if (!error) {
                        let rootBlock = result[0];

                        let ipfsHash = rootBlock.hash;
                        let mHashArray = multihash.fromB58String(ipfsHash);
                        let signature = libcrypto.sign(mHashArray, ownerKeyPair.privateKey);

                        let tag = {
                            algorithm: encryptionParams.algorithm,
                            iv: encryptionParams.iv,
                            secret: onetimeKey.toString('hex'),
                            ipfs: ipfsHash,
                            signature: {
                                v: signature.recoveryParam,
                                r: signature.r.toString('hex'),
                                s: signature.s.toString('hex')
                            }
                        };

                        console.log(`File ${ARROW} ${rootBlock.hash} `.red.bold);
                        console.log('Tag:'.blue);
                        console.log(`${JSON.stringify(tag, null, 2)}`.blue);

                        console.log(`Encrypting tag with ECDH using AES...`);

                        libcrypto.encryptObjectForParty(
                            tag,
                            ownerKeyPair,
                            !destinationPublic ? ownerKeyPair.publicKey : destinationPublic,
                            (tagEncryptionResult) => {

                                let ownerAddress = libcrypto.publicToAddress(tagEncryptionResult.ownerPubKey);
                                let partyAddress = libcrypto.publicToAddress(tagEncryptionResult.destPubKey);
                                let encryptedSymmetricTag = tagEncryptionResult.encryptedTag.cipherText.toString('base64');
                                let ownerPublicKey = '0x' + tagEncryptionResult.ownerPubKey.toString('hex');
                                let hkdf = tagEncryptionResult.hkdf;
                                let symmetricAlgorithm = tagEncryptionResult.encryptedTag.algorithm;
                                let symmetricIv = tagEncryptionResult.encryptedTag.iv;

                                var ecTag = buildEcTag(
                                    ownerAddress,
                                    partyAddress,
                                    encryptedSymmetricTag,
                                    ownerPublicKey,
                                    hkdf,
                                    symmetricAlgorithm,
                                    symmetricIv
                                );
                                this.storeEcTag(ecTag, cb);
                            }
                        );
                    } else {
                        console.error(error);
                    }
                });

            });
        });
    }

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
        var buffers = [];
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
        var tag;
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

                                var ecTag = buildEcTag(
                                    ownerAddress,
                                    partyAddress,
                                    encryptedSymmetricTag,
                                    ownerPublicKey,
                                    hkdf,
                                    symmetricAlgorithm,
                                    symmetricIv
                                );
                                this.storeEcTag(ecTag, cb);
                            }
                        );

                    } else
                        console.log(errorDecryptEc)
                });
            } else
                console.error(errorEcTag)
        });
    }

    storeEcTag(ecTag, cb) {
        let ecTagJson = JSON.stringify(ecTag);
        this.ipfs.addBuffer(Buffer.from(ecTagJson, 'utf8'), (e, r) => {
            let rb = r[0];
            let ecTagHash = rb.hash;
            if (cb) {
                cb(ecTag, ecTagHash)
            }
        });
    }
}

module.exports = FileForce;