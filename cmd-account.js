/*
 *   Copyright (C) 2017 Igor Konovalov
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

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