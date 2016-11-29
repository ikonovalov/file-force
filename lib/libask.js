/**
 * Created by ikonovalov on 06/11/16.
 */
const config = require('./config');
const ethereum = require('./libethereum');

module.exports = {

    password: (options = {ignoreConfig: false}) => {
        let password = options.ignoreConfig ?  null : config.eth.password;
        if (!password) {
            const readlineSync = require('readline-sync');
            password = readlineSync.question('Unlock account. Passphrase: ', {
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
