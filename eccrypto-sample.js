/**
 * Created by ikonovalov on 21/10/16.
 */
const crypto = require('crypto');
const ecwrapper = require('./ec-wrapper.js');

const datadir = require('path').join('/mnt/u110/ethereum', 'pnet1');

const accounts = [
    '0x7116673528278887d37038d93bd749b66110ec35',
    '0xc80671754c3fcd934089e909a4f7c947acd517a1'
];

const privateKey1 = ecwrapper.recover(datadir, accounts[0], 'dlheu0');
const publicKey1 = ecwrapper.private2public(privateKey1);

const privateKey2 = ecwrapper.recover(datadir, accounts[1], 'dlheu0');
const publicKey2 = ecwrapper.private2public(privateKey2);


// signature
let message = new Buffer('Hello', 'binary');

let signedMsg = ecwrapper.sign(message, privateKey1);

let derEncodedSignature = signedMsg.toDER();

let verificationResult = ecwrapper.verify(derEncodedSignature, message, publicKey1);

console.log(`Signature verification is ${verificationResult}`);

// DH key derivation
let dk1 = ecwrapper.deriveSharedKey(privateKey1, publicKey2);
let dk2 = ecwrapper.deriveSharedKey(privateKey2, publicKey1);
let hkdf = ecwrapper.hkdf;
let dkh = ecwrapper.deriveSharedKey(privateKey2, publicKey1, hkdf);


console.log("Derived keys1: " + dk1.toString('hex'));
console.log("Derived keys2: " + dk2.toString('hex'));
console.log("Derived -> hkdf: " + dkh.hkdf.toString('hex') + ", salt: " + dkh.salt.toString('hex'));
console.log("Keys are " + (dk1 == dk2 ? 'equals' : `not equals`));

let secret = ecwrapper.hkdf(dk2, dkh.salt);

console.log("Strong material len is " + secret.hkdf.length);
console.log("Strong material: " + secret.hkdf.toString('hex'));


// AES
let key = dkh.hkdf;
let originalMessage = 'this is a plain text';

let encrypted = ecwrapper.encrypt(originalMessage, key, {algorithm: 'aes-256-ctr', cipherEncoding: 'base64'});
console.log(JSON.stringify(encrypted));

var decrypted = ecwrapper.decrypt(
    cipherText = encrypted.ciphertext,
    secretKey = key,
    iv = encrypted.iv
);
console.log("decrypt: " + decrypted);


