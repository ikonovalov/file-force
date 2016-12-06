/**
 * Created by ikonovalov on 01/11/16.
 */
const config = require('./lib/config');

const Ethereum = require('./lib/libethereum');
const ethereum = new Ethereum(config);

const ethereumKeys = require('./lib/libcrypto');
const ask = require('./lib/libask');
const colors = require('colors');
const validator = require('validator');

module.exports = {
    keys: (arg, options) => {
        if (!arg) {
            console.log('Account not specified. Use account index or address (hex)');
            return;
        }

        const dataDir = config.eth.datadir;
        const ethAccounts = ethereum.listAccounts();
        const numberInput = validator.isInt(arg);

        if (numberInput && arg > ethAccounts.length) {
            console.log(`You have ${ethAccounts.length} accounts only. But your's input was ${arg}.`.red);
            return;
        }

        const account = numberInput ? ethAccounts[arg] : arg;
        if (numberInput) {
            console.log(`Account ${account}`)
        }
        let password = ask.password({ignoreConfig: true});

        const keys = ethereumKeys.keyPair(dataDir, account, password);
        console.log(`Private key:\t${keys.privateKey.toString('hex')}`.red.bold);
        console.log(`Public key:\t${keys.publicKey.toString('hex')}`)
    },

    ls: (arg, options) => {
        let coinbase = ethereum.coinbase();
        ethereum.listAccounts().forEach(
            (account, index) => {
                let out = `[${index}] ${account}`;
                if (account == coinbase) {
                    console.log(`${out.green.bold} <- coinbase`)
                } else {
                    console.log(out)
                }
                if (arg === 'balance') {
                    console.log(`\tBalance ${ethereum.getBalance(account)} ETH`);
                }
            });
    }
};