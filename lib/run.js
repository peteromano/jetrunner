'use strict';

module.exports = function(tests, config, callback) {
    var jetrunner = this;

    if(typeof config === 'function') {
        callback = config;
        config = {};
    }

    this.server('start', config = this.util.merge(this.config, config || {}), function() {
        var Client = require('./drivers/phantomjs');
        new Client(tests, config, callback).run(jetrunner);
    });

    return this;
};