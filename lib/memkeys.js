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

    forgetKeys(account) {
        this.accountToKeys.delete(account);
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

class TimedOutMemKeys extends MemKeys {

    constructor(dataDir, timeout) {
        super(dataDir);
        this.defaultTimeout = timeout || 60000;

    }

    storeKeys(account, keyPair, timeout) {
        super.storeKeys(account, keyPair);
        let expireTime = !timeout ? this.defaultTimeout : timeout;
        setTimeout(account => this.forgetKeys(account), expireTime, account).unref();
    }
}

class NonCachedMemKeys extends MemKeys {

    constructor(dataDir) {
        super(dataDir);
    }

    unlockKeys(account, password) {
        if (!account || !password) throw new Error('Account AND password required for non-cached ket store');
        return libcrypto.keyPair(this.dataDir, account, password);
    }

    storeKeys(account, keyPair) {
        throw 'In-memory key store deprecated';
    }

    forgetKeys(account) {
        //nop
    }

    isAccountLocked(account) {
        return true;
    }
}

module.exports = {
    simple: MemKeys,
    nonCached: NonCachedMemKeys,
    withTimeout: TimedOutMemKeys
};