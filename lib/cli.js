(function(undefined) {
    'use strict';

    var error = require('util').error,
        fs = require('fs'),
        path = require('path');

    var api = {

            server: function(command, config) {
                if(!config || !command) {
                    error('Usage: jetrunner server start --config=FILE');
                    process.exit(0);
                }

                try {
                    config = JSON.parse(fs.readFileSync(config.replace(/--\w*=(.*)/, '$1')));
                } catch(e) {
                    error(e);
                    process.exit(1);
                }

                this.server(command, config.server);
            }

        };

    function run(config) {
        if(!config) {
            error('Usage: jetrunner server start --config=FILE');
            process.exit(0);
        }

        try {
            config = JSON.parse(fs.readFileSync(config.replace(/--\w*=(.*)/, '$1')));
        } catch(e) {
            error(e);
            process.exit(1);
        }

        this.run(config.tests, {
            server: config.server,
            reporter: config.reporter
        }, function() {
            process.exit(0);
        });
    }

    module.exports = function() {
        var cmd = api[process.argv[2]];
        if(cmd) return cmd && cmd.apply(this, process.argv.slice(3)) || this;
        else return run.apply(this, process.argv.slice(2)) || this;
    };

})(undefined);