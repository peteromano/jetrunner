'use strict';

var DRIVERS_PATH = __dirname + '/drivers/',
    DRIVERS = {
        'phantomjs':    DRIVERS_PATH + 'phantomjs',
        'browserstack': DRIVERS_PATH + 'browserstack',
        'saucelabs':    DRIVERS_PATH + 'saucelabs'
    };

var path = require('path');

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
        new Client(config).runAll(tests, callback);
    });

    return this;
};