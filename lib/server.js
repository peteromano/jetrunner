(function(undefined) {
    'use strict';

    var DEFAULT_REPORTER = 'spec';

    var instance,
        app = function(options, done) {
            options = options || {};

            /**
             * Module dependencies.
             */
            var express = require('express')
              , http = require('http')
              , path = require('path');

            var app = express(),
                runner = options.runner || {},
                template = runner.template;

            app.configure(function(){
              app.set('port', options.port || process.env.PORT || 3000);
              app.set('views', __dirname + '/views');
              app.set('view engine', options.engine || 'jade');
              app.set('views', path.dirname(template));
              app.get('/', function(req, res) {
                res.render(path.basename(template).replace(path.extname(template), ''), {
                  title: 'JetRunner Unit Test Server',
                  scripts: runner.scripts || [],
                  styles: runner.styles || [],
                  lib: req.param('lib') || '',
                  test: req.param('test'),
                  ui: runner.ui || 'bdd',
                  reporter: runner.reporter || DEFAULT_REPORTER,
                });
              });

              app.use(express.favicon());
              app.use(express.logger('dev'));
              app.use(express.bodyParser());
              app.use(express.methodOverride());
              app.use(app.router);
              app.use(express.static(options.base && path.resolve(options.base) || process.cwd()));
            });

            app.configure('development', function(){
              app.use(express.errorHandler());
            });

            http.createServer(app).listen(app.get('port'), function(){
              console.log("Express server listening on port " + app.get('port'));
              done && done(app);
            });

            return app;
        };

    var api = {

            start: function(options, done) {
                return instance = instance || app(options, done);
            },

            stop: function() {
                console.log('Stopping Express server');
                process.exit(0);
            }

        };

    module.exports = function(cmd, options, done) {
        cmd = api[cmd];
        return cmd && cmd(options, done) || this;
    };

})(undefined);