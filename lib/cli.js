(function(undefined) {
    'use strict';

    var server = require('./server');

    var api = {

            server: function() {
                server.apply(server, arguments);
            }

        };

    module.exports = function() {
        var cmd = api[process.argv[2]];
        return cmd && cmd.apply(this, process.argv.slice(3)) || this;
    };

})(undefined);