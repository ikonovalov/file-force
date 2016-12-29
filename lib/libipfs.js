/**
 * Created by ikonovalov on 26/10/16.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const getFileName = path.basename;
const ipfs = require('ipfs-api');
const stream = require('stream');

function isStream (stream) {
    return typeof stream === 'object' && typeof stream.pipe === 'function';
};

module.exports = function IPFS(config) {

    this.instance = ipfs(config.ipfs.api);

    this.files = this.instance.files;

    this.addBuffer = (bufferData) => {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(bufferData);
        return this.add(bufferStream);
    };

    this.add = (file) => {
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
        return this.files.add(files);
    };

    /**
     * Expose ipfs.get
     * @param hash
     * @param callback
     */
    this.get =  (hash, callback) => {
        this.files.get(hash, callback)
    };

    this.cat = (hash, callback) => {
        this.files.cat(hash, callback)
    };

    /**
     * Store requested hash to file path.
     * @param hash
     * @param localPath
     * @param cb
     */
    this.getAndStore = (hash, localPath, cb) => {
        this.get(hash, (error, stream) => {
            let destination = fs.createWriteStream(localPath);
            stream.on('data', data => {
                data.content.pipe(destination);
            });
            stream.on('end', () => {
                if (cb) {
                    cb(destination);
                }
            });
        });
    }
};