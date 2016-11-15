/**
 * Created by ikonovalov on 21/10/16.
 */
'use strict';
const Keythereum = require('keythereum');
const ethUtils = require('ethereumjs-util');
const stream = require('stream');
const crypto = require("crypto");
const validator = require('validator');
const EC = require('elliptic').ec;
const ELLIPTIC_CURVE = 'secp256k1';
const ec = new EC(ELLIPTIC_CURVE);
const HKDF = require('node-hkdf-sync');

function isFunction(f) {
    return Object.prototype.toString.call(f) === "[object Function]";
}


// convert string to buffer
function isString(str) {
    return str.constructor === String;
}

class LibCrypto {
    constructor() {
    }

    /**
     * Generate public key from private in uncompressed form (with 04).
     * @param {Uint8Array} privateKey private key.
     * @returns {Buffer}
     */
    private2public(privateKey) {
        const pub = ec.keyFromPrivate(privateKey).getPublic('arr');
        return new Buffer(pub);
    }

    /**
     * Recover EC private key from key storage.
     * @param dataDir of ethereum network.
     * @param address of account.
     * @param password of account.
     * @returns {buffer}
     */
    recoverPrivateKey(dataDir, address, password) {
        const keyObject = Keythereum.importFromFile(address, dataDir);
        return Keythereum.recover(password, keyObject);
    }

    /**
     * Create cipher with key.
     * @param secretKey
     * @param options
     * @returns {{cipher: *, iv: *, algorithm: (*|string)}}
     */
    createCipher(secretKey, options) {
        const algorithm = options.algorithm || 'aes-256-ctr';
        const iv = options.iv || crypto.randomBytes(16);
        return {
            cipher: crypto.createCipheriv(algorithm, secretKey, iv),
            iv: iv,
            algorithm: algorithm
        };
    }

    /**
     * Create decipher with secret key and IV (or zeros(16)
     * @param secretKey
     * @param options {{iv: *, algorithm: (*|string)}}
     * @returns {{decipher: *, iv: *, algorithm: (*|string)}}
     */
    createDecipher(secretKey, options) {
        const algorithm = options.algorithm || 'aes-256-ctr';
        const iv = options.iv || zeros(16);
        return {
            decipher: crypto.createDecipheriv(algorithm, secretKey, iv),
            iv: iv,
            algorithm: algorithm
        };
    }

    /**
     * EC Key pair.
     * @param dataDir
     * @param address
     * @param password
     * @returns {{privateKey: *, publicKey: *}}
     */
    keyPair(dataDir, address, password) {
        const privateKey = this.recoverPrivateKey(dataDir, address, password);
        const publicKey = this.private2public(privateKey);
        return {
            privateKey: privateKey,
            publicKey: publicKey
        }
    }

    publicToAddress(publicKey) {
        return ethUtils.addHexPrefix(
            ethUtils.publicToAddress(publicKey, true).toString('hex')
        );
    }

    /**
     * Derive shared key for Alice's private key and Bob's public key.
     * @param privateKey1
     * @param publicKey2
     * @returns {buffer}
     */
    deriveSharedKey(privateKey1, publicKey2) {
        const keyPair1 = ec.keyFromPrivate(privateKey1);
        const keyPair2 = ec.keyFromPublic(publicKey2);
        const sharedKey = keyPair1.derive(keyPair2.getPublic());
        return sharedKey.toBuffer();
    }

    /**
     * Derive strong secret key from weak DH key material.
     * @param derivedSharedKey
     * @param options
     * @returns {{key: buffer, hkdf: {hashAgl: string, salt: buffer, info: string, size: number}}}
     */
    deriveSecretKey(derivedSharedKey, options = {}) {
        // prepare generation options
        const hashAgl = options.hashAlg || 'sha256';
        const info = options.info || 'file-force';
        const size = options.size || 32;
        const salt = str2buf(options.salt || crypto.randomBytes(32), 'hex');

        // generate key
        const hKey = new HKDF(hashAgl, salt, derivedSharedKey).derive(info, size);
        return {
            key: hKey,
            hkdf: {
                hashAgl: hashAgl,
                salt: salt.toString('hex'),
                info: info,
                size: size
            }
        };
    }

    // ECDSA ------------------------------------------------------------
    sign(message, privateKey, options = {}) {
        const keyPair = ec.keyFromPrivate(privateKey);
        const bufMsg = str2buf(message);
        const signature = keyPair.sign(bufMsg);
        return signature;
    }

    verify(signature, message, pub, options = {}) {
        if (options.v) {
            options.recoveryParam = v;
        }
        const key = ec.keyFromPublic(pub);
        return key.verify(str2buf(message), signature);
    }

    recovery(signature, message, options = {}) {
        let signEnc = options.encoding || 'base64';
        let j = 1;
        let point = ec.recoverPubKey(message, Buffer.from(signature, 'base64'), j, 'base64');
        let pair = ec.keyFromPublic(point);
        console.log(1==1);
    }

    // AES ---------------------------------------------------------------
    /**
     * Generate random secret key using RND + HKDF(sha256).
     * @param size key size (default is 32 bytes)
     * @returns {*}
     */
    randomKey(size = 32) {
        const rnd = crypto.randomBytes(size);
        return new HKDF('sha256', crypto.randomBytes(size), rnd).derive('ethereum-simm', size);
    }

    /**
     * Encrypt sourceStream and write result to destinationStream
     * @param sourceStream
     * @param destinationStream
     * @param secretKey
     * @param callback
     * @param options
     */
    encryptStream(sourceStream, destinationStream, secretKey, callback, options = {}) {
        const cipherIv = this.createCipher(secretKey, options);
        sourceStream.pipe(cipherIv.cipher).pipe(destinationStream);
        destinationStream.on('finish', () => {
            if (callback) {
                callback({
                    algorithm: cipherIv.algorithm,
                    iv: cipherIv.iv.toString('hex')
                })
            }
        });
    }

    /**
     * Decrypt stream and results to another stream.
     * @param sourceStream
     * @param destinationStream
     * @param secretKey
     * @param callback - without parameters. Called when stream is exhausted.
     * @param options
     */
    decryptStream(sourceStream, destinationStream, secretKey, callback, options = {}) {
        const decipherIv = this.createDecipher(secretKey, options);
        sourceStream.pipe(decipherIv.decipher).pipe(destinationStream);
        destinationStream.on('finish', () => {
            if (callback) {
                callback()
            }
        });
    }

    /**
     * Encrypt data with secret key.
     * @param data
     * @param secretKey
     * @param options
     * @returns {iv: buffer, ciphertext: *}
     */
    encrypt(data, secretKey, options = {}) {
        try {
            const bufferData = str2buf(data);
            const cipherParam = this.createCipher(secretKey, options);
            const encrypted = Buffer.concat(
                [
                    cipherParam.cipher.update(bufferData),
                    cipherParam.cipher.final()
                ]
            );

            return {
                algorithm: cipherParam.algorithm,
                iv: cipherParam.iv.toString('hex'),
                cipherText: encrypted,
            }


        } catch (e) {
            console.error(e);
            return null;
        }
    }

    encryptObjectForParty(object, selfKeyPair, partyPublicKey, cb) {
        let objectJson = typeof obj === 'object' ? object : JSON.stringify(object);
        let selfSharedKey = this.deriveSharedKey(selfKeyPair.privateKey, partyPublicKey);
        let selfStrongKeyMaterial = this.deriveSecretKey(selfSharedKey);
        let encryptedTag = this.encrypt(objectJson, selfStrongKeyMaterial.key);
        let result = {
            ownerPubKey: selfKeyPair.publicKey,
            destPubKey: partyPublicKey,
            hkdf: selfStrongKeyMaterial.hkdf,
            encryptedTag: encryptedTag
        };
        if (!cb) {
            return result;
        } else {
            cb(result);
        }

    }

    /**
     * Decrypt data with secret key.
     * @param data
     * @param secretKey
     * @param options
     * @returns {null}
     */
    decrypt(data, secretKey, options) {
        try {
            // options
            const algorithm = options.algorithm || 'aes-256-ctr';
            const cipherEncoding = options.cipherEncoding || 'base64';
            const iv = options.iv || zeros(16);

            // decoding
            const binData = str2buf(data, cipherEncoding);
            const binIV = str2buf(iv, 'hex');

            // prepare crypto
            var decipher = crypto.createDecipheriv(algorithm, secretKey, binIV);

            // encrypt the given text
            return Buffer.concat([decipher.update(binData), decipher.final()]);

        } catch (e) {
            console.error(e);
            return null;
        }
    }

}

function str2buf(str, enc) {
    if (isString(str)) {
        if (enc) {
            str = new Buffer(str, enc);
        } else {
            if (validator.isHexadecimal(str)) {
                str = new Buffer(str, 'hex');
            } else if (validator.isBase64(str)) {
                str = new Buffer(str, 'base64');
            } else {
                str = new Buffer(str);
            }
        }
    }
    return str;
}


module.exports = new LibCrypto();
