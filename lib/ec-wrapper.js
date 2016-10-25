/**
 * Created by ikonovalov on 21/10/16.
 */
const Keythereum = require('keythereum');
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

module.exports = {

    // EC Private and public keys ---------------------------------------
    /**
     * Recover EC private key from key storage.
     * @param datadir of ethereum network.
     * @param address of account.
     * @param password of account.
     * @returns {*} Buffer with hex inside.
     */
    recover: function (datadir, address, password) {
        console.log(`Unlock account ${address}`);
        const keyObject = Keythereum.importFromFile(address, datadir);
        return Keythereum.recover(password, keyObject);
    },

    /**
     * Generate public key from private in uncompressed form (with 04).
     * @param {Uint8Array} privateKey private key.
     * @returns {Buffer}
     */
    private2public: function (privateKey) {
        const pub = ec.keyFromPrivate(privateKey).getPublic('arr');
        return new Buffer(pub);
    },

    /**
     * Derive shared key for Alice's private key and Bob's public key.
     * @param privateKey1
     * @param publicKey2
     * @param kdf - key derivation function.
     * @returns {*}
     */
    deriveSharedKey: function (privateKey1, publicKey2, kdf) {
        const keyPair1 = ec.keyFromPrivate(privateKey1);
        const keyPair2 = ec.keyFromPublic(publicKey2);
        const sharedKey = keyPair1.derive(keyPair2.getPublic()).toBuffer();
        if (isFunction(kdf)) {
            return kdf(sharedKey)
        }
        return sharedKey;
    },

    hkdf: function (derivedKey, salt = crypto.randomBytes(32)) {
        const hKey = new HKDF('sha256', salt, derivedKey).derive('ethereum', 32);
        return {
            hkdf: hKey,
            salt: salt
        };
    },

    // ECDSA ------------------------------------------------------------
    sign: function (message, privateKey) {
        const keyPair = ec.keyFromPrivate(privateKey);
        const bufMsg = str2buf(message);
        return keyPair.sign(bufMsg);
    },

    verify: function (derSignature, message, pub) {
        const key = ec.keyFromPublic(pub);

        return key.verify(message, derSignature);
    },

    // ENCRYPT/DECRYPT
    // AES has iv with128bit length
    encrypt: function (data, secretKey, options) {
        try {
            const bufferData = str2buf(data);
            // OPTIONS                                      DEFAULTS
            const algorithm =  options.algorithm            || 'aes-256-ctr';
            const cipherEncoding = options.cipherEncoding   || 'base64';
            const iv = options.iv                           || crypto.randomBytes(16);

            var cipher = crypto.createCipheriv(algorithm, secretKey, iv);
            if (typeof data.pipe === "function") {
                // safe to use the function
            } else {
                var encrypted = Buffer.concat(
                    [
                        cipher.update(bufferData),
                        cipher.final()
                    ]
                );

                return {
                    iv: iv.toString('hex'),
                    ciphertext: encrypted.toString(cipherEncoding)
                }
            }

        } catch (e) {
            console.error(e);
            return null;
        }
    },

    decrypt: function (cipherText, secretKey, iv, algorithm = 'aes-256-ctr', cipherEncoding = 'base64'){
        try {
            // decoding
            const binData = str2buf(cipherText, cipherEncoding);
            const binIV = str2buf(iv, 'hex');

            // prepare crypto
            var decipher = crypto.createDecipheriv(algorithm, secretKey, binIV);

            // encrypt the given text
            var decrypted = decipher.update(binData, 'binary', 'utf8') + decipher.final('utf8');

            return decrypted;

        } catch (e) {
            console.error(e);
            return null;
        }
    }


};
