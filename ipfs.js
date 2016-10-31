/**
 * Created by ikonovalov on 01/11/16.
 */
const ethereum = require('./lib/web3-utils');
const account = require('./account');
const IPFS = require('./lib/ipfs-utils');
const ipfs = new IPFS('/ip4/127.0.0.1/tcp/5001');
const colors = require('colors');
const validator = require('validator');

module.exports = {

    add: (path) => {
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
};