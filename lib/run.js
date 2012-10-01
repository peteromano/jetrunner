(function(undefined) {
    'use strict';

    var DEFAULT_REPORTER = 'spec';

    var server = require('./server'),
    	path = require('path'),
        http = require('http'),
    	app;

    module.exports = function(tests, config) {
    	var runner = config.runner,
    		template = runner.template;

    	app = server('start', config.server || {});

    	app.set('views', path.dirname(template));
		app.get('/', function(req, res) {
    		res.render(path.basename(template).replace(path.extname(template), ''), {
    			title: 'JetRunner Unit Test Server',
    			scripts: runner.scripts,
    			styles: runner.styles,
    			lib: req.param('lib') || '',
    			test: req.param('test'),
    			reporter: (config.reporter || {}).html || DEFAULT_REPORTER
    		});
    	});

        return this;
    };

})(undefined);