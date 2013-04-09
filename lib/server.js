'use strict';

var express     = require('express'),
    http        = require('http'),
    path        = require('path'),
    os          = require('os'),

    app = null,

    api = {

        start: function(options, done) {
            return app = app || new Server(options, done);
        },

        stop: function() {
            process.exit(0);
        }

    };

function Server(options, done) {
    var app = express(),
        port = options.port,
        client = options.client,
        runner = options.runner,
        template = runner.template;

    app.configure(function(){
      app.set('port', port);
      app.set('view engine', runner.engine || 'jade');
      app.set('views', path.dirname(template));
      app.get('/', function(req, res) {
        res.render(path.basename(template).replace(path.extname(template), ''), {
          title: 'JetRunner Unit Test Server',
          scripts: runner.scripts || [],
          styles: runner.styles || [],
          src: req.param('src') || '',
          test: req.param('test') || '',
          ui: runner.ui || 'bdd',
          reporter: client.reporter
        });
      });

      if(runner.debug) {
        app.configure('development', function(){
            app.use(express.logger('dev'));
            app.use(express.errorHandler());
        });
      }

      app.use(express.bodyParser());
      app.use(express.methodOverride());
      app.use(app.router);
      app.use(express.static(path.resolve(runner.base)));
    });

    http.createServer(app).listen(port, function(){
      console.log('JetRunner server - ' + os.hostname() + ' - started (PORT:' + port + ', PID:' + process.pid + ')');
      process.on('exit', function () {
        logger.info('JetRunner server - ' + os.hostname() + ' - shut down (PORT:' + port + ', PID:' + process.pid + ')');
      });
      done && done(app);
    });

    return app;
}

module.exports = function(method, options, callback) {
    return api[method] && api[method](options, callback) || this;
};