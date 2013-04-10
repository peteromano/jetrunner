'use strict';

var express     = require('express'),
    http        = require('http'),
    path        = require('path'),
    os          = require('os');

var app = null,
    api = {

        start: function(config, done) {
            return app = app || new Server(config, done);
        },

        shutdown: function() {
            process.exit();
        }

    };

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
          reporter: client.reporter
        });
      });

      if(config.debug) {
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
      process
          .on('exit', function () {
            console.log('JetRunner server - shut down ' + info);
          })
          .on("SIGINT", function () {
            console.log("JeRunner - SIGINT caught - shutting down...");
            api.shutdown();
          });

      console.log('JetRunner server - started ' + info);

      done && done(app);
    });

    return app;
}

module.exports = function(method, config, callback) {
    return api[method] && api[method](config, callback) || this;
};