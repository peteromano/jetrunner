'use strict';

var path = require('path');

var DRIVERS_PATH = __dirname + '/drivers/',
    DRIVERS = {
        'phantomjs':    DRIVERS_PATH + 'phantomjs',
        'browserstack': DRIVERS_PATH + 'browserstack',
        'saucelabs':    DRIVERS_PATH + 'saucelabs'
    };

module.exports = function(tests, config, callback) {
    // Normalize parameters:
    if(typeof config === 'function') {
        callback = config;
        config = {};
    }

    // Start the server:
    this.server('start', config = this.util.merge(this.config, config || {}), function() {
        var Client = require(DRIVERS[config.client.driver] || path.resolve(config.client.driver));
        // Initialize client(s), and run all tests against the server:
        new Client(tests, config)
            .on('complete', callback || function(err) {})
            .run();
    });

    return this;
};