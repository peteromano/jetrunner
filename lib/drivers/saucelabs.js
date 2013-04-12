'use strict';

var soda            = require('soda'),
    os              = require('os'),
    url             = require('url'),
    spawn           = require('child_process').spawn,
    util            = require('../util'),
    JetRunner       = require('../'),
    Client          = require('./client'),
    TunnelClient    = require('./tunnel_client');

var R_TUNNEL_CONNECTED  = /Connected! You may start your tests\./,
    TUNNEL_ID           = ['jetrunner', os.hostname(), process.pid].join('-');

function SauceLabsClient(config) {
    var self = this
        .initialize(config)
        .once('connect', function() {
            !TunnelClient.usingExistingProcess(self.tunnel) && console.log('Tunnel created successfully! You may now remote control your browsers.'.grey);
        });
}

SauceLabsClient.prototype = util.merge(new TunnelClient, {

    name: 'SauceLabs Connect',

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
    isTunnelConnected: function(data) {
        return R_TUNNEL_CONNECTED.test(data);
    },

    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {
        var IndicatorsEnum  = this.IndicatorsEnum,
            config          = this.config,
            hostname        = os.hostname(),
            client          = config.client,
            name            = this.name,
            test            = this.buildTestURL(tests, 0),
            suite           = Client.getTestPathFromURL(test),
            existingTunnel,
            results,
            parsed,
            browser;

        function deserializeResults(serialized) {
            var r = serialized.split(',');
            results = { failed: Number(r[0]), passed: Number(r[1]), total: Number(r[2]), runtime: Number(r[3]) };
        }

        this.once('connect', function() {
            existingTunnel  = TunnelClient.usingExistingProcess(this.tunnel)
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

            console.log('JetRunner client (' + name + ') - testing remote job "' + suite + '"...');

            browser
                .chain
                .session()
                .setContext('sauce:job-name=' + hostname + ':' + suite)
                //.setContext('tunnel-identifier:' + (!existingTunnel && TUNNEL_ID || ''))
                .open(parsed.pathname + parsed.search)
                .waitForPageToLoad(10000)
                .getEval('window.jetrunner', deserializeResults)
                .end(function(err) {
                    err && console.log('JetRunner client (' + name + ') - error: ' + err);
                    this.setContext('sauce:job-info={"passed": ' + !results.failed + '}', function() {
                        browser.testComplete(function() {
                            console.log(('SauceLabs job URL: ' + browser.jobUrl).grey);
                            console.log(('SauceLabs video URL: ' + browser.videoUrl).grey);
                            console.log(('SauceLabs log URL: ' + browser.logUrl).grey);
                            console.log('JetRunner client (' + name + ') - finished remote job "' + suite +'": ' + (results.failed && (IndicatorsEnum.FAILURE + ' FAIL!').red || (IndicatorsEnum.SUCCESS + ' OK').green));
                            console.log(('Results: ' + JSON.stringify(results)).grey);
                            callback(results.failed);
                        });
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
