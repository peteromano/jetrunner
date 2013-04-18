/** @module drivers/browserstack */

'use strict';

var BrowserStack    = require('browserstack'),
    util            = require('../util'),
    spawn           = require('child_process').spawn,
    Logger          = require('../logger'),
    Client          = require('./client'),
    TunnelClient    = require('./tunnel_client');

function BrowserStackClient(tests, config) {
    this.initialize(tests, config);
}

BrowserStackClient.prototype = util.merge(new TunnelClient, {

    name: 'BrowserStack',

    /**
     * @overridden
     */
    run: function() {
        var self = this.once('connect', function() {
            /*var test            = Client.getTestURL(0),
                suite           = Client.getTestPathFromURL(test),
                name            = self.name,
                config          = self.config,
                client          = BrowserStack.createClient({
                                    username: config.client.username,
                                    password: config.client.password
                                });

            client.getBrowsers(function(err, browsers) {
                client.createWorker({
                    "version": "14.0",
                    "browser": "chrome",
                    "os": "win",
                    "url": test
                }, function(err, worker) {
                    callback(+err);
                });
            });*/

            Logger.log('JetRunner client (' + self.name + ') - API NOT IMPLEMENTED YET! Exiting...');

            self.emit('complete', Client.TestStatusEnum.FAIL);
        });
    },

    /**
     * @overridden
     * @returns ChildProcess
     */
    _spawn: function() {
        var config = this.config, client = config.client;
        return spawn('java', ['-jar', client.tunnel.path, client.key, '' + [client.domain, client.port || config.port, 1 * config.secure]]);
    },

    /**
     * @overridden
     * @param data
     * @returns {boolean}
     */
    isConnected: function(data) {
        return true;
    }

});

module.exports = BrowserStackClient;