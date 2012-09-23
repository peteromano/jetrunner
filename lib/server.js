(function(undefined) {
    'use strict';

    var api = {

            start: function() {
                require('../server/app');
            }

        };

    module.exports = function(cmd, options) {
        cmd = api[cmd];
        return cmd && cmd(options) || this;
    };

})(undefined);