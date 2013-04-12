'use strict';

var soda            = require('soda'),
    os              = require('os'),
    url             = require('url'),
    spawn           = require('child_process').spawn,
    util            = require('../util'),
    Logger          = require('../logger'),
    Client          = require('./client'),
    TunnelClient    = require('./tunnel_client');

var R_TUNNEL_CONNECTED  = /Connected! You may start your tests\./;
//var TUNNEL_ID = ['jetrunner', os.hostname(), +new Date()].join('-');

function SauceLabsClient(tests, config) {
    var self = this
        .initialize(tests, config)
        .once('connect', function() {
            !TunnelClient.usingExistingProcess(self.tunnel) && Logger.log('Tunnel created successfully! You may now remote control your browzers.'.grey);
        });
}

SauceLabsClient.prototype = util.merge(new TunnelClient, {

    name: 'SauceLabs Connect',

    /**
     * @overridden
     * @param tests
     * @param callback
     */
    run: function() {
        var IndicatorsEnum  = Client.IndicatorsEnum,
            self            = this,
            config          = this.config,
            hostname        = os.hostname(),
            client          = config.client,
            name            = this.name,
            test            = this.getTestURL(0),
            suite           = [hostname, Client.getTestPathFromURL(test)].join(':'),
            existingTunnel,
            results,
            parsed,
            browser;

        function deserializeResults(serialized) {
            var r = serialized.split(',');
            results = { failed: Number(r[0]), passed: Number(r[1]), total: Number(r[2]), runtime: Number(r[3]) };
        }

        this.once('connect', function() {
            existingTunnel  = TunnelClient.usingExistingProcess(this.tunnel);
            parsed          = url.parse(test);
            browser         = soda.createSauceClient({
                                'url': url.format({ protocol: config.secure && 'https' || 'http', host: client.domain + ':' + (client.port || config.port) }),
                                'username': client.username,
                                'access-key': client.key,
                                'max-duration': client.timeout,
                                'browser-version': client.browsers[0].version,
                                'os': client.browsers[0].os,
                                'browser': client.browsers[0].browser
                            });

            Logger.log('JetRunner client (' + name + ') - testing remote job "' + suite + '"...');

            browser
                .chain
                .session()
                .setContext('sauce:job-name=' + hostname + ':' + suite)
                //.setContext('tunnel-identifier:' + (!existingTunnel && TUNNEL_ID || ''))
                .open(parsed.pathname + parsed.search)
                .waitForPageToLoad(10000)
                .getEval('window.jetrunner', deserializeResults)
                .end(function(err) {
                    err && Logger.log('JetRunner client (' + name + ') - error: ' + err);
                    this.setContext('sauce:job-info={"passed": ' + !results.failed + '}', function() {
                        browser.testComplete(function() {
                            Logger.log(('SauceLabs job URL: ' + browser.jobUrl).grey);
                            Logger.log(('SauceLabs video URL: ' + browser.videoUrl).grey);
                            Logger.log(('SauceLabs log URL: ' + browser.logUrl).grey);
                            Logger.log(('Results: ' + JSON.stringify(results)).grey);
                            Logger.log('JetRunner client (' + name + ') - finished remote job "' + suite +'": ' + (results.failed && (IndicatorsEnum.FAILURE + ' FAIL!').red || (IndicatorsEnum.SUCCESS + ' OK').green));
                            self.emit('complete', results.failed);
                        });
                    });
                });
        });

        return this;
    },

    /**
     * @overridden
     * @returns ChildProcess
     */
    spawn: function() {
        var client = this.config.client;
        return spawn('java', ['-jar', client.tunnel.path, client.username, client.key/*, '-i', TUNNEL_ID*/]);
    },

    /**
     * @overridden
     * @param data
     * @returns {boolean}
     */
    isConnected: function(data) {
        return R_TUNNEL_CONNECTED.test(data);
    }

});

module.exports = SauceLabsClient;
