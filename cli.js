#!/usr/bin/env node
'use strict';
const ethereum = require('./lib/web3-utils');
const IPFS = require('./lib/ipfs-utils');
const ipfs = new IPFS('/ip4/127.0.0.1/tcp/5001');
const colors = require('colors');
const program = require('commander');

program
    .version('0.0.1')
    .command('accounts <command>')
        .description('Ethereum accounts operations. Commands: ls')
        .option('-b, --balance', 'Show account balance')
        .action((command, options) => {
            switch(command) {
                case 'ls': {
                    accounts_ls(options);
                    break;
                }
                default: {
                    console.log(`Command 'accounts ${command}' not found.`);
                }
            }
        });

program.command('ipfs <command> [arg]')
    .description('IPFS files operations. Command: add')
    .action((command, arg) => {
            switch(command) {
                case 'add':{
                    files_ipfs_add(arg);
                    break;
                }
            }

        });

program.parse(process.argv); // notice that we have to parse in a new statement.

function files_ipfs_add(path) {
    ipfs.add(path, (error, result) => {
        if (!error) {
            result.forEach(rootBlock => {
                console.log(`${rootBlock.path}  -> ${rootBlock.hash}`);
            })
        } else {
            console.error(error);
        }
    });
}

function accounts_ls(options) {
    let coinbase = ethereum.coinbase();
    ethereum.listAccounts().forEach(
        (account, index) => {
            let out = `[${index}] ${account}`;
            if (options.balance) {
                out += ` Balance ${ethereum.getBalance(account)} ETH`;
            }
            if (account == coinbase) {
                console.log(`${out.red.bold} <- coinbase`)
            } else {
                console.log(out)
            }
        });
}