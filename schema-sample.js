/**
 * Created by ikonovalov on 21/10/16.
 */
const crypto = require('crypto');
const cryptoUtils = require('./lib/crypto-utils.js');

const datadir = require('path').join('/mnt/u110/ethereum', 'pnet1');

const accounts = [
    '0x7116673528278887d37038d93bd749b66110ec35',
    '0xc80671754c3fcd934089e909a4f7c947acd517a1'
];

// ALICE
var timerName = "Unlock key";
console.time(timerName);
const privateKey1 = cryptoUtils.recoverPrivateKey(datadir, accounts[0], 'dlheu0');
const publicKey1 = cryptoUtils.private2public(privateKey1);
console.log("Alice's public key: " + publicKey1.toString('hex'));
console.timeEnd(timerName);

// BOB
console.time(timerName);
const privateKey2 = cryptoUtils.recoverPrivateKey(datadir, accounts[1], 'dlheu0');
const publicKey2 = cryptoUtils.private2public(privateKey2);
console.log("Bob's public key: " + publicKey2.toString('hex'));
console.timeEnd(timerName);


// DH key derivation
let agreementDHKey12 = cryptoUtils.deriveSharedKey(privateKey1, publicKey2);

// generate secret key from agreement key
let secret12 = cryptoUtils.deriveSecretKey(agreementDHKey12);

// AES
const AES_256_CTR_BASE64 = {algorithm: 'aes-256-ctr', cipherEncoding: 'base64'};

// STAGE 1 - encrypt message, message signature with random secret key, and secret key with agreement key
let originalMessage = 'this is a plain text'; // should be IPFS hash
console.log(`Alice says: '${originalMessage}'`);

let signedMsg = cryptoUtils.sign(originalMessage, privateKey1);
let encodedSignature = signedMsg.toString('base64');

let randomSecret = cryptoUtils.randomKey(32);
let combinedMessage = {
    data: originalMessage,
    signature: encodedSignature
};

let encryptedMessage = cryptoUtils.encrypt(JSON.stringify(combinedMessage), randomSecret, AES_256_CTR_BASE64);
let encryptedMasterKey = cryptoUtils.encrypt(randomSecret, secret12.key, AES_256_CTR_BASE64);

let transferObject = {
    hkdf: secret12.hkdf,                            // params for secret key generation (=> DH + hkdf)
    encryptedMasterKey: encryptedMasterKey,
    encryptedMessage: encryptedMessage
};

console.log(`Transfer -> ${JSON.stringify(transferObject, ' ')}`);
// STAGE 3 IPFS put and get


// STAGE 4 get decrypt key and message

let agreementDHKey21 = cryptoUtils.deriveSharedKey(privateKey2, publicKey1);
let secret21 = cryptoUtils.deriveSecretKey(agreementDHKey21, transferObject.hkdf);

let decryptedMasterKey = cryptoUtils.decrypt(transferObject.encryptedMasterKey.ciphertext, secret21.key, {iv: transferObject.encryptedMasterKey.iv});
let decryptedCombinedMessage = JSON.parse(
    cryptoUtils.decrypt(
        transferObject.encryptedMessage.ciphertext,
        decryptedMasterKey,
        {
            iv: transferObject.encryptedMessage.iv
        }
    )
);
let decryptedMessage = decryptedCombinedMessage.data;
let decryptedSignature = decryptedCombinedMessage.signature;
console.log(`Bob receive: '${decryptedMessage}'`);

let verificationResult = cryptoUtils.verify(decryptedSignature, decryptedMessage, publicKey1);

console.log(`Signature verification is ${verificationResult}`);
