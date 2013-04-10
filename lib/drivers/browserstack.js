'use strict';

var NOTICE_TUNNEL_STARTUP   = 'JetRunner driver - BrowserStack (local tunnel) - started',
    NOTICE_TUNNEL_SHUTDOWN  = 'JetRunner driver - BrowserStack (local tunnel) - shut down';

var BrowserStack    = require('browserstack'),
    util            = require('../util'),
    Fibers          = require('fibers'),
    JetRunner       = require('../'),
    Client          = require('./client');

function BrowserStackClient(config) {
    this
        .initialize(config)
        .connectTunnel()
        .createClient();
}

BrowserStackClient.prototype = util.merge(new Client, {
    /**
     * Field to store the BrowserStack tunnel child process
     */
    tunnel: null,

    /**
     * The actual BrowserStack API client
     */
    client: null,

    connectTunnel: function() {
        var self    = this,
            config  = this.config,
            client  = this.config.client,
            connect = this.emit.bind(this, 'tunnel:connect'),
            tunnel;

        if(client.tunnel.enabled) {
            tunnel  = this.tunnel = require('child_process').spawn('java', ['-jar', client.tunnel.path, client.key, '' + [client.domain, client.port || config.port, 1 * config.secure]]);

            console.log(NOTICE_TUNNEL_STARTUP + ' (PID:' + tunnel.pid + ')');

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

    disconnectTunnel: function() {
        console.log(NOTICE_TUNNEL_SHUTDOWN + ' (PID:' + this.tunnel.pid + ')');
        this.tunnel.kill('SIGINT');
        return this.emit('tunnel:disconnect');
    },

    /**
     * @param code
     *
     * TODO: Gracefully handle reporting and whatnot if tunnel connection is severed (which can happen from the web interface)
     */
    onTunnelSevered: function(code) {
        process.exit(code);
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
        var client = this.client,
            buildTestURL = this.buildTestURL.bind(this);

        /*this.once('tunnel:connect', function(tunnel) {
            client.getBrowsers(function(err, browsers) {
                client.createWorker({
                    "version": "14.0",
                    "browser": "chrome",
                    "os": "win",
                    "url": buildTestURL(tests, 0)
                }, function(err, worker) {
                    console.log(err, worker);
                    callback(0);
                });
            });
        });*/
    },

    /**
     * @overridden
     * @param test
     * @param callback
     */
    runOne: function(test, callback) {}

});

module.exports = BrowserStackClient;