/**
 * Created by ikonovalov on 26/10/16.
 */
const IPFS = require('./../lib/libipfs');
const ipfs = new IPFS('/ip4/127.0.0.1/tcp/5001');
const fs = require('fs');
const path = require('path');

let dir = '/home/ikonovalov/Yandex.Disk/ebooks/blockchain';
let filePath = require('path').join(dir, 'ethereum-homestead.pdf');


ipfs.add(filePath, (error, result) => {
    if (!error) {
        result.forEach(rootBlock => {
            console.log(`${rootBlock.path}  -> ${rootBlock.hash}`);
            ipfs.getAndStore(rootBlock.hash, path.join('/tmp/', rootBlock.path));
        })
    } else {
        console.error(error);
    }
});