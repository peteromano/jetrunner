(function(undefined) {
    'use strict';

    var DEFAULT_REPORTER = 'spec',
        DEFAULT_CI_REPORTER = 'tap',
        DRIVER_PATH = '../drivers/mocha-phantomjs/lib/mocha-phantomjs.coffee';

    module.exports = function(tests, config, callback) {
        if(typeof config === 'function') callback = config;
        else config = config || {};

        callback = callback || function() {};

        var spawn = require('child_process').spawn,
            path = require('path'),
            util = require('util'),
            url = require('url'),
            soda = require('soda');

        var jetrunner = this,
            driver = path.resolve(__dirname + '/' + DRIVER_PATH),
            isRemote = config.remote,
            server = config.server || {},
            reporter = server.reporter = config.reporter || (isRemote && DEFAULT_CI_REPORTER || DEFAULT_REPORTER),
            protocol = config.secure && 'https' || 'http',
            saucelabs = config.saucelabs || {},
            systems = saucelabs && saucelabs.systems,
            run = isRemote && remote || local,
            queue = [];

        function next() {
            queue.length && queue.shift()();
        }

        function done(code) {
            if(queue.length && (code == 0 || config.continueOnFail)) next();
            else callback(code);
        }

        function local() {
            util.puts('Testing ' + this + '...');

            var phantom = spawn('phantomjs', [driver, this, reporter], { stdio: config.stdio || 'inherit' });

            phantom.on('exit', function(code) {
                jetrunner.emit('phantom:exit');
                done(code);
            });

            phantom.stdout && phantom.stdout.on('data', function(data) {
                jetrunner.emit('phantom:stdout', '' + data);
            });

            phantom.stderr && phantom.stderr.on('data', function(data) {
                jetrunner.emit('phantom:stderr', '' + data);
            });
        }

        function remote() {
            var parsed = url.parse(this);

            for(var system in systems) {
                system = systems[system];

                soda.createSauceClient({
                    'url': this,
                    'username': saucelabs['username'],
                    'access-key': saucelabs['access-key'],
                    'max-duration': saucelabs['max-duration'],
                    'browser-version': system['browser-version'],
                    'os': system.os,
                    'browser': system.browser
                })
                    .chain
                    .session()
                    .open(parsed.pathname + parsed.search)
                    .waitForPageToLoad(10000)
                    .testComplete()
                    .setContext('sauce:job-result=passed')  // TODO: Implement reporting...
                    .end(function(error) {
                        jetrunner.emit('soda:end');
                        done(+error);
                    });
            }
        }

        this.server('start', server, function(app) {
            var port = isRemote && saucelabs.port || app.settings.port,
                sodaUrl = isRemote && [saucelabs.domain || 'localhost'].concat(port && port || []).join(':');

            for(var test in tests) {
                queue.push(run.bind(url.format({
                    protocol: protocol,
                    host: sodaUrl || 'localhost:' + port,
                    pathname: '/',
                    query: {
                        test: test,
                        lib: tests[test] || ''
                    }
                })));
            }

            if(queue.length) next();
            else callback(0);
        });

        return this;
    };

})(undefined);