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
