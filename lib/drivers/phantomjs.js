var MOCHA_DRIVER_PATH = '/mocha-phantomjs/lib/mocha-phantomjs.coffee';

var path    = require('path'),
    url     = require('url'),
    spawn   = require('child_process').spawn;

function PhantomJsClient(tests, config, callback) {
    this.tests = tests;
    this.config = config;
    this.callback = callback;
}

PhantomJsClient.prototype = {

    run: function(jetrunner) {
        var driver = path.resolve(__dirname + MOCHA_DRIVER_PATH),
            tests = this.tests,
            config = this.config,
            client = config.client,
            callback = this.callback || function() {},
            util = jetrunner.util,
            getTestPath = util.getTestPath,
            getSrcPath = util.getSrcPath,
            queue = [];

        function execute() {
            var phantom = spawn('phantomjs', [driver, '' + this, client.reporter], { stdio: client.stdio || 'inherit' });

            phantom.on('exit', function(code) {
                jetrunner.emit('phantomjs:exit');
                done(code);
            });

            phantom.stdout && phantom.stdout.on('data', function(data) {
                jetrunner.emit('phantomjs:stdout', '' + data);
            });

            phantom.stderr && phantom.stderr.on('data', function(data) {
                jetrunner.emit('phantomjs:stderr', '' + data);
            });
        }

        function next() {
            queue.length && queue.shift()();
        }

        function done(code) {
            if(queue.length && (code == 0 || client.continueOnFail)) next();
            else callback(code);
        }

        for(var test in tests) {
            queue.push(execute.bind(url.format({
                protocol: config.secure ? 'https' : 'http',
                port: client.port || config.port,
                hostname: client.domain,
                pathname: '/',
                query: {
                    test: getTestPath(tests, test),
                    src: getSrcPath(tests, test)
                }
            })));
        }

        if(queue.length) next();
        else callback(0);
    }

};

module.exports = PhantomJsClient;