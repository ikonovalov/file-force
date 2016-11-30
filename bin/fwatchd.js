/**
 * Created by ikonovalov on 30/11/16.
 */
const config = require('./lib/config');
const FileForceEth = require('./lib/libfileforce-eth');

const Redundant = require('./lib/libredundant');
const redundant = new Redundant(config);

const fileForce  = new FileForceEth(config);