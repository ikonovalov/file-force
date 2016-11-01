/**
 * Created by ikonovalov on 21/10/16.
 */
'use strict';
const Keythereum = require('keythereum');
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

function private2public (privateKey) {
    const pub = ec.keyFromPrivate(privateKey).getPublic('arr');
    return new Buffer(pub);
}

function recoverPrivateKey(dataDir, address, password) {
    const keyObject = Keythereum.importFromFile(address, dataDir);
    return Keythereum.recover(password, keyObject);
}

/**
 * Create cipher with key.
 * @param secretKey
 * @param options
 * @returns {{cipher: *, iv: *, algorithm: (*|string)}}
 */
function createCipher(secretKey, options) {
    const algorithm = options.algorithm || 'aes-256-ctr';
    const iv = options.iv || crypto.randomBytes(16);
    return {
        cipher: crypto.createCipheriv(algorithm, secretKey, iv),
        iv: iv,
        algorithm: algorithm
    };
}

module.exports = {

    // EC Private and public keys ---------------------------------------
    /**
     * Recover EC private key from key storage.
     * @param dataDir of ethereum network.
     * @param address of account.
     * @param password of account.
     * @returns {buffer}
     */
    recoverPrivateKey: recoverPrivateKey,

    /**
     * Generate public key from private in uncompressed form (with 04).
     * @param {Uint8Array} privateKey private key.
     * @returns {Buffer}
     */
    private2public: private2public,

    /**
     * EC Key pair.
     * @param dataDir
     * @param address
     * @param password
     * @returns {{privateKey: *, publicKey: *}}
     */
    keyPair: (dataDir, address, password) => {
        const privateKey = recoverPrivateKey(dataDir, address, password);
        const publicKey = private2public(privateKey);
        return {
            privateKey: privateKey,
            publicKey: publicKey
        }
    },

    /**
     * Derive shared key for Alice's private key and Bob's public key.
     * @param privateKey1
     * @param publicKey2
     * @returns {buffer}
     */
    deriveSharedKey: (privateKey1, publicKey2) => {
        const keyPair1 = ec.keyFromPrivate(privateKey1);
        const keyPair2 = ec.keyFromPublic(publicKey2);
        const sharedKey = keyPair1.derive(keyPair2.getPublic());
        return sharedKey.toBuffer();
    },

    /**
     * Derive strong secret key from weak DH key material.
     * @param derivedSharedKey
     * @param options
     * @returns {{key: buffer, hkdf: {hashAgl: string, salt: buffer, info: string, size: number}}}
     */
    deriveSecretKey: (derivedSharedKey, options = {}) => {
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
    },

    // ECDSA ------------------------------------------------------------
    sign: (message, privateKey) => {
        const keyPair = ec.keyFromPrivate(privateKey);
        const bufMsg = str2buf(message);
        const signature = keyPair.sign(bufMsg);
        return Buffer.from(signature.toDER());
    },

    verify: (derSignature, message, pub) => {
        const key = ec.keyFromPublic(pub);

        return key.verify(str2buf(message), str2buf(derSignature, 'base64'));
    },

    // AES ---------------------------------------------------------------
    /**
     * Generate random secret key using RND + HKDF(sha256).
     * @param size key size (default is 32 bytes)
     * @returns {*}
     */
    randomKey: (size = 32) => {
        const rnd = crypto.randomBytes(size);
        return new HKDF('sha256', crypto.randomBytes(size), rnd).derive('ethereum-simm', size);
    },

    encryptStream: (sourceStream, destinationStream, secretKey, callback, options = {}) => {
        const cipherIv= createCipher(secretKey, options);
        sourceStream.pipe(cipherIv.cipher).pipe(destinationStream);
        destinationStream.on('finish', () => {
            if (callback) {
                callback({
                    algorithm: cipherIv.algorithm,
                    iv: cipherIv.iv.toString('hex'),
                    secret: secretKey.toString('hex')
                })
            }
        });
    },

    /**
     * Encrypt data with secret key.
     * @param data
     * @param secretKey
     * @param options
     * @returns {iv: buffer, ciphertext: *}
     */
    encrypt: (data, secretKey, options) => {
        try {
            const bufferData = str2buf(data);
            const cipherEncoding = options.cipherEncoding || 'base64';
            const cipher = createCipher(secretKey, options);
            const encrypted = Buffer.concat(
                [
                    cipher.update(bufferData),
                    cipher.final()
                ]
            );

            return {
                iv: iv.toString('hex'),
                ciphertext: encrypted.toString(cipherEncoding)
            }


        } catch (e) {
            console.error(e);
            return null;
        }
    },

    /**
     * Decrypt data with secret key.
     * @param data
     * @param secretKey
     * @param options
     * @returns {null}
     */
    decrypt: (data, secretKey, options) => {
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
};
