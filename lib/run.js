'use strict';

var DRIVERS_PATH = __dirname + '/drivers/',
    DRIVERS = {
    'phantomjs':    DRIVERS_PATH + 'phantomjs',
    'browserstack': DRIVERS_PATH + 'browserstack',
    'saucelabs':    DRIVERS_PATH + 'saucelabs'
};

module.exports = function(tests, config, callback) {
    var jetrunner = this;

    if(typeof config === 'function') {
        callback = config;
        config = {};
    }

    this.server('start', config = this.util.merge(this.config, config || {}), function() {
        var Client = require(DRIVERS[config.client.driver] || path.resolve(config.client.driver));
        new Client(tests, config, callback).run(jetrunner);
    });

    return this;
};