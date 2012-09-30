(function(undefined) {
    'use strict';

    var app = require('../server/app');

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