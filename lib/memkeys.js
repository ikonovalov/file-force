/**
 * Created by ikonovalov on 29/01/17.
 */
"use strict";

const libcrypto = require('./libcrypto');

class MemKeys {

    constructor(dataDir) {
        this.dataDir = dataDir;
        this.accountToKeys = new Map();
    }

    /**
     * Unlock and cache key pair.
     * @param account
     * @param password
     * @returns {KeyPair}
     */
    unlockKeys(account, password) {
        if (this.isAccountLocked(account)) {
            let keyPair = libcrypto.keyPair(this.dataDir, account, password);
            this.storeKeys(account, keyPair);
            return keyPair;
        } else {
            return this.accountToKeys.get(account);
        }
    }

    storeKeys(account, keyPair) {
        this.accountToKeys.set(account, keyPair);
    }

    /**
     * Check is account unlocked already.
     * @param account
     * @returns {boolean}
     */
    isAccountLocked(account) {
        return !this.accountToKeys.has(account);
    }
}

module.exports = {
    Simple: MemKeys
};