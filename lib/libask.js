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
 * Created by ikonovalov on 06/11/16.
 */
const config = require('./config');
const ethereum = require('./libethereum');

const defaultOptions = {
    ignoreConfig: false,
    questionText: 'Unlock account. Passphrase: '
};

module.exports = {

    password: (options = {ignoreConfig: false}) => {
        let text = options.questionText ? options.questionText : 'Unlock account. Passphrase: ';
        let password = options.ignoreConfig ?  null : config.eth.password;
        if (!password) {
            const readlineSync = require('readline-sync');
            password = readlineSync.question(text, {
                hideEchoBack: true
            });
        }
        return password;
    },

    account: (options = {ignoreConfig: false}) => {
        let account = options.ignoreConfig ? null : config.eth.account;
        if (!account) {
            const accounts = ethereum.listAccounts();
            accounts.forEach( (acc, index) => {
                console.log(`[${index}] ${acc}`);
            });
            let accIndex = parseInt(require('readline-sync').question('Choose account index: '));
            account = accounts[accIndex];
        }
        return account;
    }

};
