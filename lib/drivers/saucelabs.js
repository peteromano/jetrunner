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

//var TUNNEL_ID           = ['jetrunner', os.hostname(), process.pid].join('-');
var TUNNEL_CONNECTED    = /Connected! You may start your tests\./;
var SERVICE_ERROR       = /The command you just sent \(getEval\) included a bad session ID\./;

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
 * @param str
 * @param data
 * @returns {*}
 */
function substitute(str, data) {
    return str.replace(/\{(.+?)\}/g, function() {
        return data[arguments[1]] || '';
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
    var data;

    try {
        data = JSON.parse(stream);
    } catch(e) {
        if(SERVICE_ERROR.test(stream)) {
            data = JetStream.SERVICE_ERROR;
        } else {
            data = JetStream.CONNECTION_ERROR;
        }
    } finally {
        this.data = data === null ? JetStream.CONNECTION_ERROR : data;
    }
}

JetStream.prototype = {
    toString: function() {
        return JSON.stringify(this.data, null, 2);
    }
};

JetStream.StatusEnum = {
    OK:                 0,
    CLIENT_ERROR:       1,
    SERVICE_ERROR:      2,
    CONNECTION_ERROR:   3
};

JetStream.SERVICE_ERROR = {
    status: JetStream.StatusEnum.SERVICE_ERROR,
    payload: null,
    errors: ['SauceLabs API encountered a problem. Maybe you\'ve run out of minutes? Check your available Mac minutes...']
};

JetStream.CONNECTION_ERROR = {
    status: JetStream.StatusEnum.CONNECTION_ERROR,
    payload: null,
    errors: ['Try using another port other than {port} (see https://saucelabs.com/docs/connect for available ports...)']
};

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
        var ERR_CODE_NAME_MAP   = {},
            TestStatusEnum      = Client.TestStatusEnum,
            IndicatorsEnum      = Client.IndicatorsEnum,
            StreamStatusEnum    = JetStream.StatusEnum,
            result              = TestStatusEnum.PASS,
            tests               = this.tests.concat(),
            getTestURL          = this.getTestURL.bind(this),
            config              = this.config,
            client              = config.client,
            //existingTunnel    = TunnelClient.usingExistingProcess(this.tunnel);
            username            = client.username,
            key                 = client.key,
            timeout             = client.timeout,
            instanceOS          = capitalize(instance.os),
            instanceBrowser     = capitalize(instance.browser),
            instanceVersion     = instance['browser-version'],
            port                = client.port || config.port || 4000,
            server              = url.format({ protocol: config.secure && 'https' || 'http', host: client.domain + ':' + port }),
            hostname            = os.hostname(),
            name                = this.name;

        ERR_CODE_NAME_MAP[StreamStatusEnum.CLIENT_ERROR]      = 'CLIENT_ERROR';
        ERR_CODE_NAME_MAP[StreamStatusEnum.CONNECTION_ERROR]  = 'CONNECTION_ERROR';
        ERR_CODE_NAME_MAP[StreamStatusEnum.SERVICE_ERROR]     = 'SERVICE_ERROR';

        function run(test) {
            var EPOCH       = '&_=' + Number(new Date),
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
                    var data = jetstream.data,
                        status = err && TestStatusEnum.FAIL || data.status,
                        failed = !!(err || status || data.payload.stats.failures),
                        errors = data.errors;

                    this.setContext('sauce:job-info={"passed": ' + !failed + '}', function() {
                        browser.testComplete(function() {
                            Logger.log('JetRunner client (' + name + ') - finished remote job "' + job +'": ' + (failed && IndicatorsEnum.FAILURE || IndicatorsEnum.SUCCESS));

                            if(err) {
                                Logger.log('JetRunner client (' + name + ') - error: ' + err);
                            } else if(data.status !== StreamStatusEnum.OK) {
                                Logger.log(('\nJetStream.' + ERR_CODE_NAME_MAP[data.status] + ':\n').yellow);
                                Logger.log(substitute(errors.join('\n'), { port: port }).yellow + '\n');
                            }

                            Logger.log('\njetstream '.grey + ('' + jetstream).grey + '\n');

                            Logger.log('SauceLabs job URL: '.grey + browser.jobUrl.cyan);
                            Logger.log('SauceLabs video URL: '.grey + browser.videoUrl.cyan);
                            Logger.log('SauceLabs log URL: '.grey + browser.logUrl.cyan + '\n');

                            next(failed);
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
