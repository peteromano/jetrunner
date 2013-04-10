'use strict';

var NOTICE_TUNNEL_STARTUP   = 'JetRunner driver - BrowserStack (local tunnel) - started',
    NOTICE_TUNNEL_SHUTDOWN  = 'JetRunner driver - BrowserStack (local tunnel) - shut down';

var browserstack    = require('browserstack'),
    util            = require('../util'),
    Fibers          = require('fibers'),
    JetRunner       = require('../'),
    Client          = require('./client');

function BrowserStackClient(config) {
    this
        .initialize(config)
        .connectTunnel();
}

BrowserStackClient.prototype = util.merge(new Client, {

    tunnel: null,

    connectTunnel: function() {
        var config = this.config,
            client = this.config.client,
            tunnel, pid;

        if(client.tunnel.enabled) {
            tunnel = this.tunnel = require('child_process').spawn('java', ['-jar', client.tunnel.path, client.key, '' + [client.domain, client.port || config.port, 1 * config.secure]]);

            console.log(NOTICE_TUNNEL_STARTUP + ' (PID:' + tunnel.pid + ')');

            tunnel.on('close', this.onTunnelSevered.bind(this));

            tunnel.stdout
                .on('data', function(data) { console.log(data); })
                .setEncoding('utf8');

            tunnel.stderr
                .on('data', function(data) { console.log(data); })
                .setEncoding('utf8');

            process.on('exit', this.disconnectTunnel.bind(this));
        }

        return this;
    },

    disconnectTunnel: function() {
        console.log(NOTICE_TUNNEL_SHUTDOWN + ' (PID:' + this.tunnel.pid + ')');
        this.tunnel.kill('SIGINT');
        return this;
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

    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {},

    /**
     * @overridden
     * @param test
     * @param callback
     */
    runOne: function(test, callback) {}

});

module.exports = BrowserStackClient;