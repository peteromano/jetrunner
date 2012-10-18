(function(undefined) {
    'use strict';

    var DEFAULT_REPORTER = 'list',
        DRIVER_PATH = '../drivers/mocha-phantomjs/lib/mocha-phantomjs.coffee';

    // TODO: More robust toggling for remote vs. local
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
            reporter = config.reporter || DEFAULT_REPORTER,
            remote = config.remote,
            saucelabs = config.saucelabs || {},
            systems = saucelabs && saucelabs.systems,
            queue = [];

        function next() {
            queue.length && queue.shift()();
        }

        function done(code) {
            if(queue.length && (code == 0 || config.continueOnFail)) next();
            else callback(code);
        }

        function runLocal() {
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

        function runRemote() {
            for(var system in systems) {
                system = systems[system];
                soda.createSauceClient({
                    'url': this.url,
                    'username': saucelabs['username'],
                    'access-key': saucelabs['access-key'],
                    'max-duration': saucelabs['max-duration'],
                    'browser-version': system['browser-version'],
                    'os': system.os,
                    'browser': system.browser
                })
                    .chain
                    .session()
                    .open('/?test=' + this.test + '&lib=' + this.lib)
                    .testComplete()
                    .end(function(error) {
                        jetrunner.emit('soda:end');
                        done();
                    });
            }
        }

        this.server('start', config.server, function(app) {
            var port = remote && saucelabs.port || app.settings.port,
                sodaUrl = [saucelabs.url || 'localhost'].concat(port && port || []).join(':');

            for(var test in tests) {
                if(remote) {
                    queue.push(runRemote.bind({
                        url: sodaUrl,
                        test: test,
                        lib: tests[test] || ''
                    }));
                } else {
                    queue.push(runLocal.bind(url.format({
                        protocol: 'http',
                        host: 'localhost:' + port,
                        pathname: '/',
                        query: {
                            test: test,
                            lib: tests[test] || ''
                        }
                    })));
                }
            }

            if(queue.length) next();
            else callback(0);
        });

        return this;
    };

})(undefined);