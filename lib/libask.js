/**
 * Created by ikonovalov on 06/11/16.
 */
const config = require('yaml-config').readConfig('./config/app.yml');
const ethereum = require('./libweb3');

module.exports = {

    password: (options = {ignoreConfig: false}) => {
        let password = options.ignoreConfig ?  null : config.eth.password;
        if (!password) {
            const readlineSync = require('readline-sync');
            password = readlineSync.question('Unlock account. Password: ', {
                hideEchoBack: true
            });
        }
        return password;
    },

    account: (options = {ignoreConfig: false}) => {
        var account = ethereum.defaultAccount() || (options.ignoreConfig ? null : config.eth.account);
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
