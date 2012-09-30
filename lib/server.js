(function(undefined) {
    'use strict';

    var instance;

    var app = module.exports = function(options) {
        if(instance) return instance;

        /**
         * Module dependencies.
         */
        var express = require('express')
          , http = require('http')
          , path = require('path');

        var app = instance = express();

        options = options || {};

        app.configure(function(){
          app.set('port', options.port || process.env.PORT || 3000);
          app.set('views', __dirname + '/views');
          app.set('view engine', options.engine || 'jade');
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
        });

        return instance;
    };

    var api = {

            start: function(options) {
                return app(options);
            }

        };

    module.exports = function(cmd, options) {
        cmd = api[cmd];
        return cmd && cmd(options) || this;
    };

})(undefined);