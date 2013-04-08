(function(undefined) {
    'use strict';

    var DEFAULT_REPORTER = 'spec',
        DEFAULT_CI_REPORTER = 'tap';

    module.exports = function(tests, config, callback) {
        if(typeof config === 'function') callback = config;
        else config = config || {};

        callback = callback || function() {};

        var spawn = require('child_process').spawn,
            path = require('path'),
            util = require('util'),
            url = require('url'),
            fibers = require('fibers');

        var jetrunner = this,
            cloud = config.cloud || {},
            server = config.server || {},
            reporter = server.reporter = config.reporter || (cloud && cloud.reporter || DEFAULT_CI_REPORTER || DEFAULT_REPORTER),
            protocol = config.secure && 'https' || 'http',
            systems = cloud && cloud.systems;

        this.server('start', server, function(app) {
            var port = cloud && cloud.port || app.settings.port,
                remoteUrl = cloud && [cloud.domain || 'localhost'].concat(port && port || []).join(':');

            // yea...

        });

        return this;
    };

})(undefined);