/**
 * Created by ikonovalov on 02/11/16.
 */
const config = require('yaml-config').readConfig('./config/app.yml');

module.exports = {
    show: (arg, options) => {
        console.log(JSON.stringify(config, null, 2));
    },

    cfg: (arg, options) => {
        return config
    }
};