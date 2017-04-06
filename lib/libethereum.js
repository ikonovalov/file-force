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
 * Created by ikonovalov on 27/10/16.
 */
const Web3 = require('web3');

class Ethereum {

    constructor(config) {
        this._web3 = new Web3();
        this.web3.setProvider(new this.web3.providers.HttpProvider(config.eth.api));
        this._eth = this.web3.eth;
    }

    get web3() {
        return this._web3;
    }

    get eth() {
        return this._eth;
    }

    get lastBlock() {
        return this.eth.getBlock('latest')
    }

    listAccounts() {
        return this.eth.accounts;
    }

    coinbase() {
        return this.eth.coinbase
    }

    getBalance(account, units = 'ether') {
        return this.web3.fromWei(this.eth.getBalance(account), units)
    }

    txCount(address) {
        return this.eth.getTransactionCount(address);
    }

    txCountWithPending(address) {
        return this.eth.getTransactionCount(address, 'pending')
    }

    get gasPrice() {
        return this.eth.gasPrice;
    }

    get defaultAccount() {
        return this.eth.defaultAccount;
    }

    sendRawTransaction(tx) {
        let txHash = this.eth.sendRawTransaction(tx);
        return txHash;
    }

}

module.exports = Ethereum;