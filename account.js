/**
 * Created by ikonovalov on 01/11/16.
 */

const ethereum = require('./lib/web3-utils');
const ethereumKeys = require('./lib/crypto-utils');
const colors = require('colors');
const validator = require('validator');

module.exports = {
    keys: (arg, options) => {
        if (!arg) {
            console.log('Account not specified. Use account index or hex argument');
            return;
        }

        const numberInput = validator.isInt(arg);
        const ethAccounts = ethereum.listAccounts();

        if (arg > ethAccounts.length) {
            console.log(`You have ${ethAccounts.length} accounts only. But your's input was ${arg}.`.red);
            return;
        }

        const account = numberInput ? ethAccounts[arg] : arg;
        if (numberInput) {
            console.log(`Account ${account}`.red.bold)
        }
        const readlineSync = require('readline-sync');
        let password = readlineSync.question('Unlock account. Password: ', {
            hideEchoBack: true
        });

        let privateKey = ethereumKeys.recoverPrivateKey(require('path').join('/mnt/u110/ethereum', 'pnet1'), account, password);
        console.log(`Private key:\t${privateKey.toString('hex')}`);

        let publicKey = ethereumKeys.private2public(privateKey);
        console.log(`Public key:\t${publicKey.toString('hex')}`)
    },

    ls: (arg, options) => {
        let coinbase = ethereum.coinbase();
        ethereum.listAccounts().forEach(
            (account, index) => {
                let out = `[${index}] ${account}`;
                if (account == coinbase) {
                    console.log(`${out.red.bold} <- coinbase`)
                } else {
                    console.log(out)
                }
                if (arg === 'balance') {
                    console.log(`\tBalance ${ethereum.getBalance(account)} ETH`);
                }
            });
    }
};