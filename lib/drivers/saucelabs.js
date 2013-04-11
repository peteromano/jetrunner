'use strict';

var R_TUNNEL_CONNECTED  = /Connected! You may start your tests\./;

var soda            = require('soda'),
    url             = require('url'),
    spawn           = require('child_process').spawn,
    util            = require('../util'),
    JetRunner       = require('../'),
    Client          = require('./client'),
    TunnelClient    = require('./tunnel_client');

function SauceLabsClient(config) {
    var self = this
        .initialize(config)
        .once('connect', function() {
            !TunnelClient.usingExistingProcess(self.tunnel) && console.log('Tunnel created SUCCESSFULLY! You may now remote control your browsers.'.grey);
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
        return spawn('java', ['-jar', client.tunnel.path, client.username, client.key])
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
            client          = config.client,
            name            = this.name,
            test            = this.buildTestURL(tests, 0),
            suite           = Client.getTestPathFromURL(test),
            parsed,
            browser;

        this.once('connect', function() {
            console.log('JetRunner client (' + name + ') - testing ' + suite + '...');

            parsed = url.parse(test);

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
                        error += error;
                        console.log('JetRunner client (' + name + ') - finished ' + suite +': ' + (error && (IndicatorsEnum.FAILURE + ' FAIL!').red || (IndicatorsEnum.SUCCESS + ' OK').green));
                        callback(error);
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
