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
            url = require('url'),
            server = require('./server'),
            app = server.call(server, 'start', config.server),
            driver = path.resolve(__dirname + '/' + DRIVER_PATH),
            reporter = config.reporter || DEFAULT_REPORTER,
            queue = [];

        function next() {
            queue.length && queue.shift()();
        }

        function run() {
            spawn('phantomjs', [driver, this, reporter], { stdio: 'inherit' })
                .on('exit', function(code) {
                    if(queue.length && (code == 0 || config.continueOnFail)) next();
                    else callback(code);
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

        return this;
    };

})(undefined);