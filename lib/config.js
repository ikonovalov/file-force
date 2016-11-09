/**
 * Created by ikonovalov on 09/11/16.
 */
const p = require('path');
const CONFIG_PATH = p.join(p.dirname(__filename), '../config/app.yml');
const config = require('yaml-config').readConfig(CONFIG_PATH);

module.exports = config;