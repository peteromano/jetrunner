'use strict';

var MOCHA_PHANTOMJS_PATH = '/mocha-phantomjs/lib/mocha-phantomjs.coffee';

var path        = require('path'),
    url         = require('url'),
    qs          = require('querystring'),
    colors      = require('colors'),
    spawn       = require('child_process').spawn,
    util        = require('../util'),
    JetRunner   = require('../'),
    Client      = require('./client');

function PhantomJsClient(config) {
    this.initialize(config);
}

PhantomJsClient.prototype = util.merge(new Client, {
    /**
     * @overridden
     * @param tests
     * @param callback
     */
    runAll: function(tests, callback) {
        var client      = this.config.client,
            queue       = this.queue,
            getTestPath = Client.getTestPath,
            getSrcPath  =  Client.getSrcPath;

        callback = callback || function() {};

        function runOne(url, callback) {
            return function() {
                this.runOne(url, callback);
            }.bind(this)
        }

        for(var test in tests) {
            this.addRunner(runOne.call(this, url.format({
                protocol: this.config.secure ? 'https' : 'http',
                port: client.port || this.config.port,
                hostname: client.domain,
                pathname: '/',
                query: {
                    test: getTestPath(tests, test),
                    src: getSrcPath(tests, test)
                }
            }), callback));
        }

        if(queue.length) this.runNext();
        else callback(this.StatusEnum.OK);
    },

    /**
     * @overridden
     * @param test
     * @param callback
     *
     * TODO: Find out how to use the same PhantomJS instance for each test suite! (https://github.com/metaskills/mocha-phantomjs/tree/v2.0.1)
     */
    runOne: function(test, callback) {
        var IndicatorsEnum  = this.IndicatorsEnum,
            OK              = this.StatusEnum.OK,
            queue           = this.queue,
            runNext         = this.runNext.bind(this),
            client          = this.config.client,
            suite           = qs.parse(url.parse(test).query).test,
            phantom         = spawn('phantomjs', [path.resolve(__dirname + MOCHA_PHANTOMJS_PATH), test, client.reporter], { stdio: client.stdio || 'inherit' }),
            pid;

        function done(code) {
            if(queue.length && (code == OK || client.continueOnFail)) runNext();
            else callback(code);
        }

        console.log('JetRunner driver - PhantomJS - started' + (pid = ' PID:' + phantom.pid));
        console.log('JetRunner driver - PhantomJS - testing ' + suite + '...');
        console.log(('URL: ' + decodeURIComponent(test)).grey);

        phantom.on('exit', function(code) {
            JetRunner.emit('phantomjs:exit');
            console.log('JetRunner driver - PhantomJS - finished ' + suite +': ' + (code && (IndicatorsEnum.FAILURE + ' FAIL!').red || (IndicatorsEnum.SUCCESS + ' OK').green));
            console.log('JetRunner driver - PhantomJS - shut down' + (pid = ' PID:' + phantom.pid));
            done(code);
        });

        phantom.stdout && phantom.stdout.on('data', function(data) {
            JetRunner.emit('phantomjs:stdout', '' + data);
        });

        phantom.stderr && phantom.stderr.on('data', function(data) {
            JetRunner.emit('phantomjs:stderr', '' + data);
        });
    }

});

module.exports = PhantomJsClient;