(function(undefined) {
    'use strict';

    var DEFAULT_REPORTER = 'spec',
        DRIVER_PATH = '../resources/mocha-phantomjs/lib/mocha-phantomjs.coffee';

    module.exports = function(tests, config, callback) {
    	var spawn = require('child_process').spawn,
            path = require('path'),
            url = require('url'),
            app = require('./server')('start', config.server || {}),
            driverPath = path.resolve(__dirname + '/' + DRIVER_PATH),
            runner = config.runner || {},
            reporter = config.reporter || DEFAULT_REPORTER,
    		template = runner.template,
            queue = [];

        function next() {
            queue.length && queue.shift()();
        }

        function run() {
            spawn('phantomjs', [driverPath, this, reporter], { stdio: 'inherit' })
                .on('exit', function(code) {
                    if(queue.length && code == 0) next();
                    else callback(code);
                });
        }

    	app.set('views', path.dirname(template));
		app.get('/', function(req, res) {
    		res.render(path.basename(template).replace(path.extname(template), ''), {
    			title: 'JetRunner Unit Test Server',
    			scripts: runner.scripts,
    			styles: runner.styles,
    			lib: req.param('lib') || '',
    			test: req.param('test')
    		});
    	});

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