/** @module drivers/saucelabs */

'use strict';

var soda            = require('soda'),
    os              = require('os'),
    url             = require('url'),
    spawn           = require('child_process').spawn,
    util            = require('../util'),
    Logger          = require('../logger'),
    Client          = require('./client'),
    TunnelClient    = require('./tunnel_client');

//var TUNNEL_ID = ['jetrunner', os.hostname(), process.pid].join('-');
var TUNNEL_CONNECTED  = /Connected! You may start your tests\./;
var SAUCELABS_ERROR = /The command you just sent \(getEval\) included a bad session ID\./

/**
 * @param {Array} tests Array of objects pairing test files with their source file counterparts (or just the test file)
 * @param {Object} config JetRunner configuration
 * @constructor
 */
function SauceLabsClient(tests, config) {
    var self = this
        .initialize(tests, config)
        .once('connect', function() {
            !TunnelClient.usingExistingProcess(self.tunnel) && Logger.log('Tunnel created successfully! You may now remote control your browzers.'.grey);
        });
}

/**
 * @private
 */
function capitalize(str, beginning) {
    return str.replace(beginning ? /^[a-z]/gi : /(?:\s|^)[a-z]/gi, function(c) {
        return c.toUpperCase();
    });
}

/**
 * @private
 */
function expandParallelInstances(browsers, maxParallel) {
    var runs = (browsers = [].concat(browsers)).length >= (maxParallel = Math.max(maxParallel, 1)) ? browsers.length / maxParallel : browsers.length,
        instances = [];

    for(var run = 0; run < runs; run++) {
        instances.push(browsers.splice(0, maxParallel));
    }

    return instances;
}

/**
 * @param {String} stream
 * @constructor
 */
function JetStream(stream) {
    var deserialized;

    if(SAUCELABS_ERROR.test(stream)) {
        this.output = JetStream.SERVICE_ERROR;
    } else if(stream === JetStream.NULL) {
        this.output = JetStream.NOT_IMPLEMENTED;
    } else {
        deserialized = stream.split(',');
        this.output = { failed: Number(deserialized[0]), passed: Number(deserialized[1]), total: Number(deserialized[2]), runtime: Number(deserialized[3]) };
    }
}

/**
 * @todo Actually implement output.
 */
JetStream.prototype.toString = function() {
    return this.output;
};

JetStream.NOT_IMPLEMENTED   = 31;
JetStream.SERVICE_ERROR     = 32;
JetStream.NULL              = 'null';

SauceLabsClient.prototype = util.merge(new TunnelClient, {

    name: 'SauceLabs Connect',

    /**
     * @overridden
     */
    run: function() {
        var TestStatusEnum = Client.TestStatusEnum,
            browsers = this.config.client.browsers,
            continueOnFail = this.config.client.continueOnFail,
            self = this.once('connect', function() {
                var parallels = expandParallelInstances(browsers, self.config.client.maxParallel),
                    result = TestStatusEnum.PASS;

                function run(instances) {
                    var remaining = instances.length;

                    function done(failed) {
                        result |= failed;
                        if(result != TestStatusEnum.PASS && !continueOnFail) {
                            if(!--remaining) {
                                complete();
                            }
                        } else if(!--remaining) {
                            next();
                        }
                    }

                    if(remaining) {
                        while(instances.length) {
                            self.runInstance(instances.shift(), done);
                        }
                    } else {
                        next();
                    }
                }

                function next() {
                    if(parallels.length) {
                        run(parallels.shift());
                    } else {
                        complete();
                    }
                }

                function complete() {
                    self.emit(result == TestStatusEnum.PASS ? 'success' : 'failure', result || undefined);
                    self.emit('complete', result);
                }

                next();
            });
    },

    /**
     * @param instance
     * @param callback
     * @todo Handle running out of minutes and all other service issues.
     *
     * Available ports: 80, 443, 888, 2000, 2001, 2020, 2222, 3000, 3001, 3030, 3333, 4000, 4001, 4040, 4502, 4503, 5000, 5001, 5050, 5555, 6000, 6001, 6060, 6666, 7000, 7070, 7777, 8000, 8001, 8003, 8031, 8080, 8081, 8888, 9000, 9001, 9080, 9090, 9999, 49221
     * (https://saucelabs.com/docs/connect)
     */
    runInstance: function(instance, callback) {
        var STREAM_NOT_IMPLEMENTED = JetStream.NOT_IMPLEMENTED,
            SERVICE_ERROR   = JetStream.SERVICE_ERROR,
            TestStatusEnum  = Client.TestStatusEnum,
            IndicatorsEnum  = Client.IndicatorsEnum,
            result          = TestStatusEnum.PASS,
            tests           = this.tests.concat(),
            getTestURL      = this.getTestURL.bind(this),
            config          = this.config,
            client          = config.client,
            //existingTunnel  = TunnelClient.usingExistingProcess(this.tunnel);
            username        = client.username,
            key             = client.key,
            timeout         = client.timeout,
            instanceOS      = capitalize(instance.os),
            instanceBrowser = capitalize(instance.browser),
            instanceVersion = instance['browser-version'],
            port            = client.port || config.port || 4000,
            server          = url.format({ protocol: config.secure && 'https' || 'http', host: client.domain + ':' + port }),
            hostname        = os.hostname(),
            name            = this.name;

        function run(test) {
            var EPOCH       = '&_=' + 1*new Date,
                jetstream   = null,
                job         = [hostname, instanceOS, instanceBrowser + ' ' + instanceVersion, Client.getTestPathFromURL(test)].join(' - '),
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

            Logger.log('JetRunner client (' + name + ') - testing remote job "' + job + '"...');
            Logger.log('JetRunner URL: '.grey + decodeURIComponent(test + EPOCH).cyan);

            browser
                .chain
                .session()
                .setContext('sauce:job-name=' + job)
                //.setContext('tunnel-identifier:' + (!existingTunnel && TUNNEL_ID || ''))
                .open(parsed.pathname + parsed.search + EPOCH)
                .waitForPageToLoad(10000)
                .getEval('window.jetstream', function(stream) { jetstream = new JetStream(stream); })
                .end(function(err) {
                    var results = jetstream.output,
                        failed = results === STREAM_NOT_IMPLEMENTED || results === SERVICE_ERROR ? results : !!results.failed;

                    err && Logger.log('JetRunner client (' + name + ') - error: ' + err);

                    this.setContext('sauce:job-info={"passed": ' + !failed + '}', function() {
                        browser.testComplete(function() {
                            Logger.log('JetRunner client (' + name + ') - finished remote job "' + job +'": ' + (failed && IndicatorsEnum.FAILURE || IndicatorsEnum.SUCCESS));

                            switch(results) {
                                case STREAM_NOT_IMPLEMENTED:
                                    Logger.log('Results: '.grey + 'JetStream.NOT_IMPLEMENTED'.grey);
                                    Logger.log('\nNote: Internet Explorer 8 (and earlier) is not currently supported, and if that\'s not your problem,'.yellow);
                                    Logger.log(('then try using another port other than ' + port + ' (see https://saucelabs.com/docs/connect for available ports...)\n').yellow);
                                    break;
                                case SERVICE_ERROR:
                                    Logger.log('Results: '.grey + 'JetStream.SERVICE_ERROR'.grey);
                                    Logger.log('\nMaybe you\'re out of minutes?\n'.yellow);
                                    break;
                                default:
                                    Logger.log('Results: '.grey + JSON.stringify(results).grey);
                            }

                            Logger.log('SauceLabs job URL: '.grey + browser.jobUrl.cyan);
                            Logger.log('SauceLabs video URL: '.grey + browser.videoUrl.cyan);
                            Logger.log('SauceLabs log URL: '.grey + browser.logUrl.cyan);

                            next(failed || TestStatusEnum.PASS);
                        });
                    });
                });
        }

        function next(failed) {
            result |= failed;
            if((!failed || client.continueOnFail) && tests.length) {
                run(getTestURL(tests.shift()));
            } else {
                callback && callback(result);
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

module.exports = SauceLabsClient;
