/** @module drivers/phantomjs */

'use strict';

var MOCHA_PHANTOMJS_PATH = '/mocha-phantomjs/lib/mocha-phantomjs.coffee';

var path        = require('path'),
    url         = require('url'),
    spawn       = require('child_process').spawn,
    util        = require('../util'),
    Logger      = require('../logger'),
    JetRunner   = require('../'),
    Client      = require('./client');

function PhantomJsClient(tests, config) {
    this.initialize(tests, config);
}

PhantomJsClient.prototype = util.merge(new Client, {

    name: 'PhantomJS',

    queue: [],

    /**
     * @overridden
     *
     * TODO: Find out how to use the same PhantomJS instance for all test suites! (https://github.com/metaskills/mocha-phantomjs/tree/v2.0.1)
     */
    run: function() {
        var self = this, tests = this.tests;

        function runInstanceWith(url) {
            return function() {
                self._runInstance(url);
            };
        }

        for(var test in tests) {
            this._addRunner(runInstanceWith(this.getTestURL(test)));
        }

        if(this.queue.length) this._runNext();
        else this.emit('complete', this.TestStatusEnum.PASS);
    },

    /**
     * @param test
     */
    _runInstance: function(test) {
        var IndicatorsEnum  = Client.IndicatorsEnum,
            TestStatusEnum  = Client.TestStatusEnum,
            self            = this,
            queue           = this.queue,
            runNext         = this._runNext.bind(this),
            client          = this.config.client,
            name            = this.name,
            suite           = Client.getTestPathFromURL(test),
            phantom         = spawn('phantomjs', [path.resolve(__dirname + MOCHA_PHANTOMJS_PATH), test, client.reporter], { stdio: 'inherit' }),
            pid;

        function done(code) {
            if(queue.length && (code == TestStatusEnum.PASS || client.continueOnFail)) runNext();
            else {
                self.emit(!code ? 'success' : 'failure', code || undefined);
                self.emit('complete', code);
            }
        }

        Logger.log('JetRunner client (' + name + ') - started' + (pid = ' (PID:' + phantom.pid + ')'));
        Logger.log('JetRunner client (' + name + ') - testing "' + suite + '"...');
        Logger.log('JetRunner URL: '.grey + decodeURIComponent(test).cyan);

        phantom.on('exit', function(code) {
            Logger.log('JetRunner client (' + name + ') - finished "' + suite +'": ' + (code && IndicatorsEnum.FAILURE || IndicatorsEnum.SUCCESS));
            Logger.log('JetRunner client (' + name + ') - shut down' + pid);
            done(code);
        });
    },

    /**
     * @param {Function} runner
     * @returns {*}
     */
    _addRunner: function(runner) {
        this.queue.push(runner);
        return this;
    },

    _runNext: function() {
        this.queue.length && this.queue.shift()();
        return this;
    }

});

module.exports = PhantomJsClient;