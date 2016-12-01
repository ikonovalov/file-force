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
                } else {
                    cb('[FAIL  ]', null)
                }
            }
        });

    }

    providers(hash, cb) {
        this.dht.findprovs(hash, cb)
    }
}

module.exports = Redundant;