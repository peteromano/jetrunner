'use strict';

var NOTICE_TUNNEL   = 'JetRunner client - BrowserStack (local tunnel) - ';

var BrowserStack    = require('browserstack'),
    util            = require('../util'),
    Fibers          = require('fibers'),
    JetRunner       = require('../'),
    TunnelClient    = require('./tunnel_client');

function BrowserStackClient(config) {
    this.initialize(config).createClient();
}

BrowserStackClient.prototype = util.merge(new TunnelClient, {

    notices: {
        tunnelStartup:  NOTICE_TUNNEL + 'started',
        tunnelShutdown: NOTICE_TUNNEL + 'shut down'
    },

    /**
     * The actual BrowserStack API client
     */
    client: null,

    /**
     * @overidden
     * @returns {*}
     */
    connectTunnel: function() {
        var self    = this,
            config  = this.config,
            client  = this.config.client,
            connect = this.emit.bind(this, 'tunnel:connect'),
            tunnel;

        if(client.tunnel.enabled) {
            tunnel  = this.tunnel = require('child_process').spawn('java', ['-jar', client.tunnel.path, client.key, '' + [client.domain, client.port || config.port, 1 * config.secure]]);

            console.log(this.notices.tunnelStartup + ' (PID:' + tunnel.pid + ')');

            process.on('exit', this.disconnectTunnel.bind(this));

            tunnel.on('close', this.onTunnelSevered.bind(this));

            tunnel.stdout
                .on('data', function(data) {
                    console.log(data);
                    connect(tunnel);
                    self.on('newListenener', function(event, listener) {
                        connect(tunnel);
                    });
                })
                .setEncoding('utf8');

            tunnel.stderr
                .on('data', function(data) { console.log(data); })
                .setEncoding('utf8');
        }

        return this;
    },

    createClient: function() {
        var config = this.config.client;

        this.client = BrowserStack.createClient({
            username: config.username,
            password: config.password
        });

        return this;
    },

    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {
        var buildTestURL    = this.buildTestURL.bind(this),
            client          = this.client;

        this.once('tunnel:connect', function(tunnel) {
            client.getBrowsers(function(err, browsers) {
                client.createWorker({
                    "version": "14.0",
                    "browser": "chrome",
                    "os": "win",
                    "url": buildTestURL(tests, 0)
                }, function(err, worker) {
                    console.log('JetRunner client - BrowserStack API - NOT IMPLEMENTED!');
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