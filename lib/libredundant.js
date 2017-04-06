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

/**
 * Created by ikonovalov on 30/11/16.
 */
const ipfs = require('ipfs-api');

class Redundant {

    constructor(config) {
        this._instance = ipfs(config.ipfs.api);
        this.files = this._instance.files;
        this.dht = this._instance.dht;
    }

    pull(hash, cb) {
        this.files.get(hash, (error, objectStrem) => {
            if (!error) {
                if (cb) {
                    cb(null, '[PULLED]');
                }
            } else {
                if(cb) {
                    cb(`[FAILED] ${error.message}`, null);
                }
            }
        });

    }

    providers(hash, cb) {
        this.dht.findprovs(hash, cb)
    }
}

module.exports = Redundant;