'use strict';

var argv = require('optimist')
    .alias('v', 'version')
    .argv;

module.exports = function() {
    return argv.version ? console.log('JetRunner version - ' + this.VERSION) : this.server('start', this.config);
};