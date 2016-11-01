/**
 * Created by ikonovalov on 26/10/16.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const getFileName = path.basename;
const ipfs = require('ipfs-api');


function isStream (stream) {
    return typeof stream === 'object' && typeof stream.pipe === 'function';
};

module.exports = function IPFS(url) {

    this.instance = ipfs(url);

    this.files = this.instance.files;

    this.add = (file, callback) => {
        let files;
        if (isStream(file)) { // file is stream already
            files = [
                {
                    path: file.constructor.name,
                    content: file
                }
            ];
        } else { // prepare stream from file path
            const fileStream = fs.createReadStream(file);
            const fileName = getFileName(file);
            files = [
                {
                    path: fileName,
                    content: fileStream
                }
            ];
        }
        const addPromise = this.files.add(files);
        addPromise
            .then(function (stream) {
                callback(null, stream)
            })
            .catch(function (err, stream) {
                callback(err, null)
            });
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