/*
 *   Copyright (C) 2017 Igor Konovalov
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
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
        return this.instance.add(files);
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