/**
 * Created by ikonovalov on 24/11/16.
 */
"use strict";
const FileForce = require('./libfileforce');

class FileForceEthereum extends FileForce {

    constructor(config) {
        super(config);
    }

}

module.exports = FileForceEthereum;