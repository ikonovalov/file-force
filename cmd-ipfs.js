/**
 * Created by ikonovalov on 01/11/16.
 */
const config = require('./lib/config');
const ask = require('./lib/libask');

const validator = require('validator');
const fs = require('fs');
const tmp = require('tmp');
const colors = require('colors');

const FileForce = require('./lib/libfileforce');
const FileForceEth = require('./lib/libfileforce-eth');
const fileForce = config.ipfs['enable-eth'] ? new FileForceEth(config) : new FileForce(config);

const ARROW = '\u2192';

function printObject(error, object) {
    if (!error) {
        console.log(JSON.stringify(object, null, 2))
    } else
        console.error(error)
}

module.exports = {

    /**
     * Add single (now) file.
     * @param path to file.
     */
    add: (path) => {
        const account = ask.account();
        const password = ask.password();
        console.log(`Unlock ETH account ${account}`);
        const selfKeyPair = fileForce.unlockKeys(account, password);
        fileForce.add(path, selfKeyPair, selfKeyPair.publicKey, (error, result) => {
            if (!error) {
                console.log('ecTag stored in IPFS');
                console.log(`ecTag ${ARROW} ${result.hash} `.red.bold);
                console.log('ecTag:');
                console.log(`${JSON.stringify(result.ecTag, null, 2)}`.blue)

            } else {
                console.error(error)
            }
        });
    },

    cat: (hash) => {
        fileForce.cat(hash, process.stdout);
    },

    ecTag: (ecTagHash) => {
        fileForce.ecTagByHash(ecTagHash, printObject);
    },

    decryptEcTag: (ecTagHash) => {
        fileForce.ecTagByHash(ecTagHash, (error, ecTag) => {
            if (!error) {
                let account = ecTag.partyAddress;
                console.log(`Party account ${account}.`);
                let password = ask.password(/*{ignoreConfig: true}*/);
                const selfKeyPair = fileForce.unlockKeys(account, password);
                fileForce.decryptEcTag(ecTag, selfKeyPair, printObject);
            } else
                console.error(error)
        });
    },

    decrypt: (ecTagHash) => {
        fileForce.ecTagByHash(ecTagHash, (error, ecTag) => {
            if (!error) {
                let account = ecTag.partyAddress;
                console.log(`Party account ${account}.`);
                let password = ask.password(/*{ignoreConfig: true}*/);
                const selfKeyPair = fileForce.unlockKeys(account, password);
                fileForce.decryptEcTag(ecTag, selfKeyPair, (error, tag) => {
                    fileForce.decryptByTag(tag, process.stdout);
                });
            } else
                console.error(error)
        });
    },

    delegate: (ecTagHash, anotherPublic) => {
        fileForce.ecTagByHash(ecTagHash, (error, ecTag) => {
                let account = ecTag.partyAddress;
                console.log(`Party account ${account}.`);
                let password = ask.password(/*{ignoreConfig: true}*/);
                let selfKeyPair = fileForce.unlockKeys(account, password);
                fileForce.delegateTag(ecTagHash, selfKeyPair, anotherPublic, (error, result) => {
                    if (!error) {
                        console.log(`Origin ecTag ${result.hash} delegated to ${result.ecTag.partyAddress} with new ecTag ${result.hash}`.blue.bold);
                        console.log(`Transfer  ${result.ecTag.ownerAddress} ${ARROW} ${result.ecTag.partyAddress} complete.`.blue.bold);
                    } else {
                        console.error(error)
                    }
                });
            }
        );
    },

    watch: (filter = {}) => {
        fileForce.watch(filter, (error, event) => {

        })
    }

};