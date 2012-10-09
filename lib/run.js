(function(undefined) {
    'use strict';

    var DEFAULT_REPORTER = 'spec',
        DRIVER_PATH = '../drivers/mocha-phantomjs/lib/mocha-phantomjs.coffee';

    module.exports = function(tests, config, callback) {
        if(typeof config === 'function') callback = config;
        else config = config || {};

        callback = callback || function() {};

        var spawn = require('child_process').spawn,
            path = require('path'),
            util = require('util'),
            url = require('url'),
            jetrunner = this,
            app = this.server('start', config.server, ready.bind(this)),
            driver = path.resolve(__dirname + '/' + DRIVER_PATH),
            reporter = config.reporter || DEFAULT_REPORTER,
            queue = [];

        function ready() {

            function next() {
                queue.length && queue.shift()();
            }

            function run() {
                util.puts('Testing ' + this + '...');

                var phantom = spawn('phantomjs', [driver, this, reporter], { stdio: config.stdio || 'pipe' });

                phantom.on('exit', function(code) {
                    jetrunner.emit('phantom:exit');
                    if(queue.length && (code == 0 || config.continueOnFail)) next();
                    else callback(code);
                });

                phantom.stdout && phantom.stdout.on('data', function(data) {
                    jetrunner.emit('phantom:stdout', '' + data);
                });

                phantom.stderr && phantom.stderr.on('data', function(data) {
                    jetrunner.emit('phantom:stderr', '' + data);
                });
            }

            for(var test in tests) queue.push(run.bind(url.format({
                protocol: 'http',
                host: 'localhost:' + app.settings.port,
                pathname: '/',
                query: {
                    test: test,
                    lib: tests[test] || ''
                }
            })));

            if(queue.length) next();
            else callback(0);

        }

        return this;
    };

})(undefined);