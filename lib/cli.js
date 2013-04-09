'use strict';

var argv = require('optimist')
    .alias('v', 'version')
    .argv;

module.exports = function() {
    return argv.version ? console.log('JetRunner v' + this.VERSION) : this.run();
};