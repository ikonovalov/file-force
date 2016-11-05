/**
 * Created by ikonovalov on 01/11/16.
 */
const config = require('yaml-config').readConfig('./config/app.yml');
const ethereum = require('./lib/libweb3');
const ethereumKeys = require('./lib/libcrypto');
const ask = require('./lib/libask');
const colors = require('colors');
const validator = require('validator');

module.exports = {
    keys: (arg, options) => {
        if (!arg) {
            console.log('Account not specified. Use account index or hex argument');
            return;
        }

        const dataDir = config.eth.datadir;
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
        let password = ask.password();

        const keys = ethereumKeys.keyPair(dataDir, account, password);
        console.log(`Private key:\t${keys.privateKey.toString('hex')}`);
        console.log(`Public key:\t${keys.publicKey.toString('hex')}`)
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