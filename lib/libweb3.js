/**
 * Created by ikonovalov on 27/10/16.
 */
var Web3 = require('web3');
var web3 = new Web3();
var providerUrl = 'http://localhost:8545';
web3.setProvider(new web3.providers.HttpProvider(providerUrl));

const eth = web3.eth;

module.exports = {

    web3: web3,

    listAccounts: () => {
        return eth.accounts;
    },

    coinbase: () => {
        return eth.coinbase
    },

    getBalance: (account, units = 'ether') => {
        return web3.fromWei(eth.getBalance(account), units)
    },

    defaultAccount: () => {
        return eth.defaultAccount;
    }
};