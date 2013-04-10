'use strict';

var soda        = require('soda'),
    util        = require('../util'),
    JetRunner   = require('../'),
    Client      = require('./client');

function SauceLabsClient(config) {
    this.initialize(config);
}

SauceLabsClient.prototype = util.merge(new Client, {
    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {
        /*soda.createSauceClient({
         'url': this,
         'username': saucelabs['username'],
         'access-key': saucelabs['access-key'],
         'max-duration': saucelabs['max-duration'],
         'browser-version': system['browser-version'],
         'os': system.os,
         'browser': system.browser
         })
         .chain
         .session()
         .open(parsed.pathname + parsed.search)
         .waitForPageToLoad(10000)
         .testComplete()
         .setContext('sauce:job-result=passed')
         .end(function(error) {
         jetrunner.emit('soda:end');
         done(+error);
         });*/
    },

    /**
     * @overridden
     * @param test
     * @param callback
     */
    runOne: function(test, callback) {}

});

module.exports = SauceLabsClient;