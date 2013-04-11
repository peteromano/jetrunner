'use strict';

var BrowserStack    = require('browserstack'),
    util            = require('../util'),
    spawn           = require('child_process').spawn,
    JetRunner       = require('../'),
    Client          = require('./client'),
    TunnelClient    = require('./tunnel_client');

function BrowserStackClient(config) {
    this.initialize(config);
}

BrowserStackClient.prototype = util.merge(new TunnelClient, {

    name: 'BrowserStack',

    /**
     * @overridden
     * @returns ChildProcess
     */
    spawn: function() {
        var config = this.config, client = config.client;
        return spawn('java', ['-jar', client.tunnel.path, client.key, '' + [client.domain, client.port || config.port, 1 * config.secure]])
    },

    /**
     * @overridden
     * @param data
     * @returns {boolean}
     */
    isTunnelConnected: function(data) {
        return true;
    },

    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {
        var test    = this.buildTestURL(tests, 0),
            name            = this.name,
            suite           = Client.getTestPathFromURL(test),
            config          = this.config,
            client          = BrowserStack.createClient({
                                username: config.client.username,
                                password: config.client.password
                            });

        this.once('connect', function() {
            console.log('JetRunner client (' + name + ') - testing ' + suite + '...');

            client.getBrowsers(function(err, browsers) {
                client.createWorker({
                    "version": "14.0",
                    "browser": "chrome",
                    "os": "win",
                    "url": test
                }, function(err, worker) {
                    console.log('JetRunner client (' + name + ') - API not implemented yet! Exiting...');
                    callback(0);
                });
            });
        });
    },

    /**
     * @overridden
     * @param test
     * @param callback
     */
    runOne: function(test, callback) {}

});

module.exports = BrowserStackClient;