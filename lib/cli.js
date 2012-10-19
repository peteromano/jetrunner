(function(undefined) {
    'use strict';

    var util = require('util'),
        fs = require('fs'),
        path = require('path');

    var api = {

            "--version": function() {
                util.puts('JetRunner version ' + this.version());
            },

            server: function(command, config) {
                function start() {
                    if(!config) {
                        util.error('Usage: jetrunner server start --config=FILE');
                        process.exit(0);
                    }

                    try {
                        config = JSON.parse(fs.readFileSync(config.replace(/--\w*=(.*)/, '$1')));
                    } catch(e) {
                        util.error(e);
                        process.exit(1);
                    }
                }

                if(!command) {
                    util.error('Usage: jetrunner server COMMAND [--config=FILE]');
                    process.exit(0);
                }

                if(command == 'start') start();

                this.server(command, config && config.server || undefined);
            },

            remote: function(config) {
                if(!config) {
                    util.error('Usage: jetrunner remote --config=FILE');
                    process.exit(0);
                }

                config.remote = true;

                run.call(this, config, true);
            }

        };

    function run(config, remote) {
        if(!config) {
            util.error('Usage: jetrunner --config=FILE');
            process.exit(0);
        }

        try {
            config = JSON.parse(fs.readFileSync(config.replace(/--\w*=(.*)/, '$1')));
        } catch(e) {
            util.error(e);
            process.exit(1);
        }

        this.run(config.tests, {
            remote: remote || config.remote,
            server: config.server,
            reporter: config.reporter,
            secure: config.secure,
            saucelabs: config.saucelabs
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