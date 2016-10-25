/**
 * Created by ikonovalov on 11/10/16.
 */
var ipfsAPI = require('ipfs-api');
var multihashes = require('multihashes');

// or connect with multiaddr
var ipfs = ipfsAPI('/ip4/127.0.0.1/tcp/5001');

// ipfs cat /ipfs/QmNNTPXZhrsCKSUN8hcadFcpWvJDgVCjJMBUYAaMDrDUxR
/*ipfs.files.cat(
 "QmNNTPXZhrsCKSUN8hcadFcpWvJDgVCjJMBUYAaMDrDUxR",
 function (err, stream) {
 stream.on('data', (chunk) => {
 console.log(chunk.toString());
 })
 });*/

var fs = require('fs');
var dir = '/mnt/u110/ethereum/js/';
var fileName = 'mineSome.js';
var path = require('path').join(dir, fileName);
var readStream = fs.createReadStream(path);

var fileAddedCallback = function (err, res) {
    if (!err) {
        console.log('File added:')
        console.log(res)
        var mhash = multihashes.fromB58String(res[0].hash);
        var decBuf = multihashes.decode(mhash);
        console.log('Multihash: ');
        console.log(decBuf)

    } else {
        console.error(err)
    }
}


var files = [
    {
        path: fileName,
        content: readStream
    }
];

ipfs.files.add(files, fileAddedCallback);

