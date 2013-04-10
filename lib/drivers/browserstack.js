'use strict';

var browserstack    = require('browserstack'),
    util            = require('../util'),
    Fibers          = require('fibers'),
    JetRunner       = require('../'),
    Client          = require('./client');

function BrowserStackClient(config) {
    this.initialize(config);
}

BrowserStackClient.prototype = util.merge(new Client, {
    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {

    },

    /**
     * @overridden
     * @param test
     * @param callback
     */
    runOne: function(test, callback) {}

});

module.exports = BrowserStackClient;