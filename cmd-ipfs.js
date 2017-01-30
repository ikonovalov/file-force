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

const Redundant = require('./lib/libredundant');
const redundant = new Redundant(config);

const eventType = require('./lib/libfileforce-eth').eventType;
const fileForce = config.ipfs['enable-eth'] ? new FileForceEth(config) : new FileForce(config);

const ARROW = '\u2192';

const EVENT_OFFSET = config.eth['event-offset'];

function printObject(object) {
    console.log(JSON.stringify(object, null, 2))
}

function calculateStartBlockOffset(eventFilter) {
    return eventFilter.fromBlock ? eventFilter.fromBlock : fileForce.ethereum.lastBlock.number - EVENT_OFFSET;
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

        fileForce
            .add(path, selfKeyPair, selfKeyPair.publicKey)
            .then((result) => {
                console.log('ecTag stored in IPFS');
                console.log(`ecTag ${ARROW} ${result.hash} `.red.bold);
                console.log('ecTag:');
                console.log(`${JSON.stringify(result.ecTag, null, 2)}`.blue)
            })
            .catch(error => {
                console.error(error);
            });

        // ecTag handled via final callback, but file's tag and hash handled vie event
        fileForce.once('IPFS#ADD#FILE', (hash, account) => {
            console.log(`File ${ARROW} ${hash}`.red.bold);
        });
    },

    cat: (hash) => {
        fileForce.cat(hash, process.stdout);
    },

    ecTag: (ecTagHash) => {
        fileForce.ecTagByHash(ecTagHash).then(ecTag => printObject(ecTag)).catch(error => console.log(error.getMessage().red));
    },

    decryptEcTag: (ecTagHash) => {
        fileForce
            .ecTagByHash(ecTagHash)
            .then(ecTag => {
                let account = ecTag.partyAddress;
                console.log(`Party account ${account}.`);
                let password = ask.password({ignoreConfig: true});
                const selfKeyPair = fileForce.unlockKeys(account, password);
                return {
                    selfKeyPair: selfKeyPair,
                    ecTag: ecTag
                };

            })
            .then(result => {
                return fileForce.decryptEcTag(result.ecTag, result.selfKeyPair);
            })
            .then(tag => {
                printObject(tag)
            })
            .catch(error => {
                console.error(error)
            });
    },

    decrypt: (ecTagHash) => {
        fileForce
            .ecTagByHash(ecTagHash)
            .then(ecTag => {
                let account = ecTag.partyAddress;
                let password = ask.password({
                    ignoreConfig: true,
                    questionText: `Party account ${account}. Unlock passphrase: `
                });
                const selfKeyPair = fileForce.unlockKeys(account, password);
                fileForce
                    .decryptEcTag(ecTag, selfKeyPair)
                    .then(tag => {
                        fileForce.decryptByTag(tag, process.stdout);
                    });
            })
            .catch(error => {
                console.log(error)
            });
    },

    delegate: (ecTagHash, anotherPublic) => {
        fileForce
            .ecTagByHash(ecTagHash)
            .then(ecTag => {
                    let account = ecTag.partyAddress;
                    console.log(`Party account ${account}.`);
                    let password = ask.password({ignoreConfig: true});
                    let selfKeyPair = fileForce.unlockKeys(account, password);
                    fileForce
                        .delegateTag(ecTagHash, selfKeyPair, anotherPublic)
                        .then(result => {
                            console.log(`Origin ecTag ${ecTagHash} delegated to ${result.ecTag.partyAddress} with new ecTag ${result.hash}`.blue.bold);
                            console.log(`Transfer  ${result.ecTag.ownerAddress} ${ARROW} ${result.ecTag.partyAddress} complete.`.blue.bold);
                        })
                        .catch(error => {
                            console.error(error)
                        });
                }
            );
    },

    fwatch: (eventFilter = {}) => {
        let startBlock = calculateStartBlockOffset(eventFilter);
        console.log(`Watching block range ${startBlock} ${ARROW} latest`.blue);
        fileForce.watchEvents(eventType.NewFileAppeared,
            {},
            {
                fromBlock: startBlock,
                toBlock: 'latest'
            },
            (error, event) => {
                if (!error) {
                    console.log(FileForceEth.bnToMultihash58(event.args.ipfs));
                }
            }
        );
        return
    },

    ecwatch: (eventFilter = {}) => {
        let startBlock = calculateStartBlockOffset(eventFilter);
        console.log(`Watching block range ${startBlock} ${ARROW} latest`.blue);

        fileForce.watchEvents(eventType.EcTagRegistered,
            {},
            {
                fromBlock: startBlock,
                toBlock: 'latest'
            },
            (error, event) => {
                if (!error) {
                    console.log(FileForceEth.bnToMultihash58(event.args.ipfs));
                }
            }
        )
    },

    ecdwatch: (eventFilter = {}) => {
        let startBlock = calculateStartBlockOffset(eventFilter);
        console.log(`Watching block range ${startBlock} ${ARROW} latest`.blue);

        fileForce.watchEvents(eventType.EcTagDelegated,
            {},
            {
                fromBlock: startBlock,
                toBlock: 'latest'
            },
            (error, event) => {
                if (!error) {
                    let args = event.args;
                    let ipfsOrigin = FileForceEth.bnToMultihash58(args.ipfsOrigin);
                    let ipfsNew = FileForceEth.bnToMultihash58(args.ipfsNew);
                    console.log(`${ipfsOrigin} ${ARROW} ${ipfsNew}`);
                }
            }
        )
    },

    pull: (hash) => {
        redundant.pull(hash, () => console.log('Pulled'));
    },

    /** EXPERIMENTAL !!! **/
    providers: (hash) => {
        redundant.providers(hash).then(peers => console.log(peers)).catch(error => console.log(error))
    }
};