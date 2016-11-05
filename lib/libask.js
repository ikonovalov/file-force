/**
 * Created by ikonovalov on 06/11/16.
 */
const config = require('yaml-config').readConfig('./config/app.yml');
const ethereum = require('./libweb3');

module.exports = {

    password: () => {
        let password = config.eth.password;
        if (!password) {
            const readlineSync = require('readline-sync');
            password = readlineSync.question('Unlock account. Password: ', {
                hideEchoBack: true
            });
        }
        return password;
    },

    account: () => {
        var account = ethereum.defaultAccount() || config.eth.account;
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
