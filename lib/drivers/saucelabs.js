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
var RESULTS_NULL = 'null';
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
     */
    run: function() {
        var self = this.once('connect', function() {
            self.runInstance(self.config.client.browsers[0], self.emit.bind(self, 'complete'));
        });
    },

    runInstance: function(instance, callback) {
        var FAIL_PROXY      = SauceLabsClient.TestStatusEnum.FAIL_PROXY,
            IndicatorsEnum  = Client.IndicatorsEnum,
            //existingTunnel  = TunnelClient.usingExistingProcess(this.tunnel);
            config          = this.config,
            client          = config.client,
            port            = client.port || config.port,
            hostname        = os.hostname(),
            name            = this.name,
            test            = this.getTestURL(0),
            suite           = [hostname, Client.getTestPathFromURL(test)].join(':'),
            parsed          = url.parse(test),
            results         = null,
            browser         = soda.createSauceClient({
                                'url': url.format({ protocol: config.secure && 'https' || 'http', host: client.domain + ':' + (client.port || config.port) }),
                                'username': client.username,
                                'access-key': client.key,
                                'max-duration': client.timeout,
                                'browser-version': instance.version,
                                'os': instance.os,
                                'browser': instance.browser
                            });

        function deserializeResults(serialized) {
            var deserialized;
            if(serialized !== RESULTS_NULL) {
                deserialized = serialized.split(',');
                results = { failed: Number(deserialized[0]), passed: Number(deserialized[1]), total: Number(deserialized[2]), runtime: Number(deserialized[3]) };
            }
        }

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
                var failed = results === null && FAIL_PROXY || !!results.failed;
                err && Logger.log('JetRunner client (' + name + ') - error: ' + err);
                this.setContext('sauce:job-info={"passed": ' + !failed + '}', function() {
                    browser.testComplete(function() {
                        Logger.log(('SauceLabs job URL: ' + browser.jobUrl).grey);
                        Logger.log(('SauceLabs video URL: ' + browser.videoUrl).grey);
                        Logger.log(('SauceLabs log URL: ' + browser.logUrl).grey);
                        if(failed == FAIL_PROXY) Logger.log(('Results: SauceLabsClient.TestStatusEnum.FAIL_PROXY (maybe local port ' + port +' is blocked? Try using another port...)').grey);
                        else Logger.log(('Results: ' + JSON.stringify(results)).grey);
                        Logger.log('JetRunner client (' + name + ') - finished remote job "' + suite +'": ' + (failed && (IndicatorsEnum.FAILURE + ' FAIL!').red || (IndicatorsEnum.SUCCESS + ' OK').green));
                        callback && callback(failed);
                    });
                });
            });
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

/**
 * @static
 * @type {{FAIL_PROXY: number}}
 */
SauceLabsClient.TestStatusEnum = {
    FAIL_PROXY: 21
};

module.exports = SauceLabsClient;
