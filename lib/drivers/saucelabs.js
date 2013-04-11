'use strict';

var NOTICE_TUNNEL       = 'JetRunner client - SauceLabs Connect (local tunnel) - ',
    R_TUNNEL_CONNECTED  = /Connected! You may start your tests\./;

var soda            = require('soda'),
    colors          = require('colors'),
    url             = require('url'),
    colors          = require('colors'),
    util            = require('../util'),
    JetRunner       = require('../'),
    TunnelClient    = require('./tunnel_client');

function SauceLabsClient(config) {
    this.initialize(config);
}

SauceLabsClient.prototype = util.merge(new TunnelClient, {

    notices: {
        tunnelStartup:  NOTICE_TUNNEL + 'started',
        tunnelShutdown: NOTICE_TUNNEL + 'shut down'
    },

    /**
     * @overidden
     */
    connectTunnel: function() {
        var self    = this,
            client  = this.config.client,
            connect = this.emit.bind(this, 'tunnel:connect'),
            tunnel;

        if(client.tunnel.enabled) {
            tunnel  = this.tunnel = require('child_process').spawn('java', ['-jar', client.tunnel.path, client.username, client.key]);

            console.log(this.notices.tunnelStartup + ' (PID:' + tunnel.pid + ')');
            console.log('Just give it a few of seconds...'.grey);

            process.on('exit', this.disconnectTunnel.bind(this));

            tunnel.on('close', this.onTunnelSevered.bind(this));

            tunnel.stdout
                .on('data', function(data) {
                    console.log(data);

                    if(R_TUNNEL_CONNECTED.test(data)) {
                        console.log('Tunnel created SUCCESSFULLY. You may now remote control your browsers.'.grey);
                        connect(tunnel);
                        self.on('newListenener', function(event, listener) {
                            connect(tunnel);
                        });
                    }
                })
                .setEncoding('utf8');

            tunnel.stderr
                .on('data', function(data) { console.log(data); })
                .setEncoding('utf8');
        }

        return this;
    },

    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {
        var buildTestURL    = this.buildTestURL.bind(this),
            config          = this.config,
            client          = config.client,
            parsed,
            browser;

        this.once('tunnel:connect', function(tunnel) {
            parsed = url.parse(buildTestURL(tests, 0));

            browser = soda.createSauceClient({
                'url': url.format({ protocol: config.secure && 'https' || 'http', host: client.domain + ':' + (client.port || config.port) }),
                'username': client.username,
                'access-key': client.key,
                'max-duration': client.timeout,
                'browser-version': client.browsers[0].version,
                'os': client.browsers[0].os,
                'browser': client.browsers[0].browser
            });

            browser
                .chain
                .session()
                .open(parsed.pathname + parsed.search)
                .waitForPageToLoad(10000)
                .setContext('sauce:job-result=passed')
                .end(function(error) {
                    browser.testComplete(function() {
                        console.log('JetRunner client - SauceLabs API - done');
                        callback(+error);
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

module.exports = SauceLabsClient;
