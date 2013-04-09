'use strict';

var argv = require('optimist')
    .alias('v', 'version')
    .argv;

module.exports = function() {
    return argv.version ? console.log('JetRunner version - ' + this.VERSION) : this.run([
        { '/example/test/adder_test.js': '/example/src/adder.js' }
    ]);
};