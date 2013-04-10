'use strict';

var url     = require('url'),
    util    = require('../util');

/**
 * @abstract
 */
function Client() {}

Client.prototype = util.createEventEmitter({

    StatusEnum: {
        OK: 0
    },

    IndicatorsEnum: {
        SUCCESS:    '✓',
        FAILURE:    '✕'
    },

    queue: [],

    /**
     * @param config
     */
    initialize: function(config) {
        this.config = config;
        return this;
    },

    /**
     * @abstract
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {},

    /**
     * @abstract
     * @param test
     * @param callback
     */
    runOne: function(test, callback) {},

    /**
     * @param {Function} runner
     * @returns {*}
     */
    addRunner: function(runner) {
        this.queue.push(runner);
        return this;
    },

    runNext: function() {
        this.queue.length && this.queue.shift()();
        return this;
    },

    buildTestURL: function(tests, test) {
        var config = this.config;
        return url.format({
            protocol: config.secure ? 'https' : 'http',
            port: config.client.port || config.port,
            hostname: config.client.domain,
            pathname: '/',
            query: {
                test: Client.getTestPath(tests, test),
                src: Client.getSrcPath(tests, test)
            }
        });
    }

});

/**
 * @static
 * @param tests
 * @param test
 * @returns {*}
 */
Client.getTestPath = function(tests, test) {
    return typeof tests[test] !== 'string' ? Object.keys(tests[test])[0] : tests[test];
};

/**
 * @static
 * @param tests
 * @param test
 * @returns {boolean|*|string}
 */
Client.getSrcPath = function(tests, test) {
    return typeof tests[test] !== 'string' && tests[test][Object.keys(tests[test])[0]] || '';
};

module.exports = Client;