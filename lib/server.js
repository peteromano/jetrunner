(function(undefined) {
    'use strict';

    var server = require('../server/app');

    var api = {

            start: function(options) {
                server.call(server, options);
            }

        };

    module.exports = function(cmd, options) {
        cmd = api[cmd];
        return cmd && cmd(options) || this;
    };

})(undefined);