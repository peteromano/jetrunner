module.exports = function(options) {
    /**
     * Module dependencies.
     */

    var express = require('express')
      , routes = require('./routes')
      , http = require('http')
      , path = require('path');

    var app = express();

    options = options || {};

    app.configure(function(){
      app.set('port', options.port || process.env.PORT || 3000);
      app.set('views', __dirname + '/views');
      app.set('view engine', 'jade');
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

    app.get('/', routes.index);

    http.createServer(app).listen(app.get('port'), function(){
      console.log("Express server listening on port " + app.get('port'));
    });

};