#!/usr/bin/env node
'use strict';
const program = require('commander');
const web3_utils = require('./lib/web3-utils');
const colors = require('colors');

program
    .version('0.0.1')
    .command('accounts <command>')
    .description('Ethereum accounts operations')
    .option('-b, --balance', 'Show account balance')
    .action((command, options) => {
        if (command == 'ls') {
            accounts_ls(options);
        }
    });

program.parse(process.argv); // notice that we have to parse in a new statement.

function accounts_ls(options) {
    let coinbase = web3_utils.coinbase();
    web3_utils.listAccounts().forEach(
        account => {
            let out = account;
            if (options.balance) {
                out += ` balance ${web3_utils.getBalance(account)} ETH`;
            }
            if (account == coinbase) {
                console.log(`${out.red.bold} <- coinbase`)
            } else {
                console.log(out)
            }
        });
}