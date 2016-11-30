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

    pull(hash) {
        this.files.get(hash)
    }

    providers(hash, cb) {
        this.dht.findprovs(hash, cb)
    }
}

module.exports = Redundant;