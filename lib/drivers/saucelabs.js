'use strict';

var soda            = require('soda'),
    os              = require('os'),
    url             = require('url'),
    spawn           = require('child_process').spawn,
    util            = require('../util'),
    Logger          = require('../logger'),
    Client          = require('./client'),
    TunnelClient    = require('./tunnel_client');

//var TUNNEL_ID = ['jetrunner', os.hostname(), +new Date()].join('-');
var TUNNEL_CONNECTED  = /Connected! You may start your tests\./;
var RESULTS_NULL = 'null';

function SauceLabsClient(tests, config) {
    var self = this
        .initialize(tests, config)
        .once('connect', function() {
            !TunnelClient.usingExistingProcess(self.tunnel) && Logger.log('Tunnel created successfully! You may now remote control your browzers.'.grey);
        });
}

function expandParallelInstances(browsers, maxParallel) {
    var runs = (browsers = [].concat(browsers)).length >= (maxParallel = Math.max(maxParallel, 1)) ? browsers.length / maxParallel : browsers.length,
        instances = [];

    for(var run = 0; run < runs; run++) {
        instances.push(browsers.splice(0, maxParallel));
    }

    return instances;
}

SauceLabsClient.prototype = util.merge(new TunnelClient, {

    name: 'SauceLabs Connect',

    /**
     * @overridden
     *
     * TODO: Handle no browsers specified.
     */
    run: function() {
        var browsers = this.config.client.browsers,
            self = this.once('connect', function() {
                var parallels = expandParallelInstances(browsers, self.config.client.maxParallel);

                function run(instances) {
                    var remaining = instances.length;

                    function done(failed) {
                        if(!--remaining) {
                            next(failed);
                        }
                    }

                    while(instances.length) {
                        self.runInstance(instances.shift(), done);
                    }
                }

                function next(failed) {
                    if(parallels.length) {
                        run(parallels.shift());
                    } else {
                        self.emit('complete', failed);
                    }
                }

                next();
            });
    },

    /**
     * @param instance
     * @param callback
     *
     * TODO: Cancel currently running remote jobs on SIGINT (to prevent runaway jobs in the cloud).
     *
     * Available ports: 80, 443, 888, 2000, 2001, 2020, 2222, 3000, 3001, 3030, 3333, 4000, 4001, 4040, 4502, 4503, 5000, 5001, 5050, 5555, 6000, 6001, 6060, 6666, 7000, 7070, 7777, 8000, 8001, 8003, 8031, 8080, 8081, 8888, 9000, 9001, 9080, 9090, 9999, 49221
     * (https://saucelabs.com/docs/connect)
     */
    runInstance: function(instance, callback) {
        var FAIL_PROXY      = SauceLabsClient.TestStatusEnum.FAIL_PROXY,
            IndicatorsEnum  = Client.IndicatorsEnum,
            //existingTunnel  = TunnelClient.usingExistingProcess(this.tunnel);
            failed          = 0,
            getTestURL      = this.getTestURL.bind(this),
            tests           = this.tests.concat(),
            config          = this.config,
            client          = config.client,
            username        = client.username,
            key             = client.key,
            timeout         = client.timeout,
            instanceOS      = instance.os,
            instanceBrowser = instance.browser,
            instanceVersion = instance.version,
            port            = client.port || config.port || 4000,
            server          = url.format({ protocol: config.secure && 'https' || 'http', host: client.domain + ':' + port }),
            hostname        = os.hostname(),
            name            = this.name;

        function run(test) {
            var results     = null,
                job         = [hostname, Client.getTestPathFromURL(test)].join(':'),
                parsed      = url.parse(test),
                browser     = soda.createSauceClient({
                                'url': server,
                                'username': username,
                                'access-key': key,
                                'max-duration': timeout,
                                'browser': instanceBrowser,
                                'browser-version': instanceVersion,
                                'os': instanceOS
                            });

            function deserializeResults(serialized) {
                var deserialized;
                if(serialized !== RESULTS_NULL) {
                    deserialized = serialized.split(',');
                    results = { failed: Number(deserialized[0]), passed: Number(deserialized[1]), total: Number(deserialized[2]), runtime: Number(deserialized[3]) };
                }
            }

            Logger.log('JetRunner client (' + name + ') - testing remote job "' + job + '"...');

            browser
                .chain
                .session()
                .setContext('sauce:job-name=' + hostname + ':' + job)
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
                            Logger.log('JetRunner client (' + name + ') - finished remote job "' + job +'": ' + (failed && (IndicatorsEnum.FAILURE + ' FAIL!').red || (IndicatorsEnum.SUCCESS + ' OK').green));
                            next(failed);
                        });
                    });
                });
        }

        function next() {
            failed |= failed;
            if(tests.length && (!failed || client.continueOnFail)) {
                run(getTestURL(tests.shift()));
            } else {
                callback && callback(failed);
            }
        }

        next();
    },

    /**
     * @overridden
     * @returns ChildProcess
     *
     * See https://saucelabs.com/docs/connect for available flags and options
     */
    spawn: function() {
        var client = this.config.client,
            tunnel = client.tunnel,
            args = ['-jar', tunnel.path, client.username, client.key, '-F', tunnel.fastFailRegexps, '-f', tunnel.readyFile/*, '-i', TUNNEL_ID*/];

        return spawn('java', args.concat(this.config.debug && ['-d']));
    },

    /**
     * @overridden
     * @param data
     * @returns {boolean}
     */
    isConnected: function(data) {
        return TUNNEL_CONNECTED.test(data);
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
