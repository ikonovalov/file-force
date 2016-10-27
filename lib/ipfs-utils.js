/**
 * Created by ikonovalov on 26/10/16.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const getFileName = path.basename;
const ipfs = require('ipfs-api');


module.exports = function IPFS(url) {

    this.instance = ipfs(url);

    this.files = this.instance.files;

    this.add = (filePath, callback) => {
        var readStream = fs.createReadStream(filePath);
        const fileName = getFileName(filePath);
        var files = [
            {
                path: fileName,
                content: readStream
            }
        ];
        this.files.add(files, callback);
    };

    this.get =  (hash, callback) => {
        this.files.get(hash, callback);
    };

    this.getAndStore = (hash, localPath, callback) => {
        this.get(hash, (error, stream) => {
            let destination = fs.createWriteStream(localPath);
            stream.on('data', data => {
                console.log(`Handling block ${data.path}`);
                data.content.pipe(destination);
            });
            if (callback) {
                callback();
            }
        });
    }

};