(function(undefined) {
    'use strict';

    var server = require('./server'),
    	instance;

    module.exports = function(tests, config) {
    	instance = server('start', config.server || {});
        return this;
    };

})(undefined);