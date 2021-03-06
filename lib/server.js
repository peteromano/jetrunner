/** @module server */

'use strict';

var express     = require('express'),
    http        = require('http'),
    path        = require('path'),
    os          = require('os'),
    Logger      = require('./logger');

var app = null,
    api = {

        start: function(config, done) {
            return app = app || new Server(config, done);
        },

        shutdown: function() {
            process.exit();
        }

    };

/**
 * @param config
 * @param done
 * @constructor
 * @todo Handle errors and send an appropriate code back to the client, so the test runner doesn't think the test failed because of the actual test.
 *       This is especially an issue with 500 server errors that come from invalid jade syntax or something in the test runner template - you can
 *       get an Express template rendering error (server error), which would cause a test suite to fail...
 */
function Server(config, done) {
    var app = express(),
        port = config.port,
        client = config.client,
        runner = config.runner,
        domain = client.domain,
        template = runner.template,
        info = '(' + os.hostname()  + ', ' + domain + ':' + port + ', PID:' + process.pid + ')';

    app.configure(function(){
      app.set('port', port);
      app.set('view engine', runner.engine || 'jade');
      app.set('views', path.dirname(template));
      app.get('/', function(req, res) {
        res.render(path.basename(template).replace(path.extname(template), ''), {
          title: 'JetRunner ' + info,
          scripts: runner.scripts,
          styles: runner.styles,
          src: req.param('src') || '',
          test: req.param('test') || '',
          ui: runner.method,
          reporter: client.reporter,
          DEBUG: config.debug && 'true' || 'false'
        });
      });

      if(config.debug) {
        app.configure('development', function(){
            app.use(express.logger('dev'));
            app.use(express.errorHandler());
        });
      }

      app.use(express.compress());
      app.use(express.bodyParser());
      app.use(express.methodOverride());
      app.use(app.router);
      app.use(express.static(path.resolve(runner.base)));
    });

    http.createServer(app).listen(port, function(){
      process
          .on('exit', function () {
            Logger.log('JetRunner server - shut down ' + info);
          })
          .on("SIGINT", function () {
            Logger.log("JeRunner - SIGINT caught - shutting down...");
            api.shutdown();
          });

      Logger.log('JetRunner server - started ' + info);

      done && done(app);
    });

    return app;
}

module.exports = function(method, config, callback) {
    return api[method] && api[method](config, callback) || this;
};