/** @module cli */

'use strict';

var path    = require('path'),
    colors  = require("colors"),
    Logger  = require('./logger'),
    argv    = require('optimist')
                .usage('Start test server instance, or run a suite of tests on the server instance.\nUsage: $0')
                .alias('v', 'version')
                .describe('v', 'Display the current version')
                .alias('s', 'server')
                .alias('r', 'run')
                .alias('c', 'config')
                .argv;

module.exports = function() {
    var ERR_BAD_CONFIG = '\nUsage: ' + process.argv.splice(0,2).join(' ') + ' --config [path/to/config.json]',
        util = this.util,
        config;

    if(argv.version) {
        Logger.log('JetRunner version - ' + this.VERSION);
        return this;
    }

    try {
        config = argv.config && util.merge(this.config, require(path.resolve(argv.config))) || this.config;
    } catch(e) {
        console.error('JetRunner error - bad config file.' + ERR_BAD_CONFIG);
        process.exit();
    }

    if(argv.server) {
        this.server(argv.server === true && 'start' || argv.server, config);
    } else if(!config.tests) {
        Logger.log('JetRunner error - no tests to run.' + ' \nSeriously, dude, c\'mon...'.grey);
	    process.exit();
    } else {
        this.run(config.tests, config, function(code) { process.exit(Number(code)); });
    }

    return this;
};
