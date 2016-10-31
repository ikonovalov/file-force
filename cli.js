#!/usr/bin/env node
'use strict';
const ethereum = require('./lib/web3-utils');
const account = require('./account');
const ipfs = require('./ipfs');
const colors = require('colors');
const program = require('commander');
const validator = require('validator');

program
    .version('0.0.1')
    .command('account <command> [arg]')
    .description('Ethereum account operations. Commands: ls, public')
    .action((command, arg, options) => {
        switch (command) {
            case account.ls.name: {
                account.ls(arg, options);
                break;
            }
            case account.keys.name: {
                account.keys(arg, options);
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
        switch (command) {
            case ipfs.add.name: {
                ipfs.add(arg);
                break;
            }
        }

    });

program.parse(process.argv); // notice that we have to parse in a new statement.


