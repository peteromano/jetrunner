'use strict';

var exec    = require('child_process').exec,
    util    = require('../util'),
    Client  = require('./client');

/**
 * @abstract
 * @param config
 * @constructor
 */
function TunnelClient(config) {}

TunnelClient.prototype = util.merge(new Client, {
    /**
     * Field to store the tunnel child process (or PID if tunnel is already running)
     * @type ChildProcess|Number
     */
    tunnel: null,

    initialize: function(config) {
        Client.prototype.initialize.call(this, config);
        return this.connect();
    },

    connect: function() {
        var self = this,
            client = this.config.client,
            tunnel;

        function connect() {
            self.emit('connect');
            self.on('newListenener', function(event, listener) {
                self.emit('connect');
            });
        }

        if(client.tunnel.enabled) {
            TunnelClient.getRunningProcessPID(client.tunnel.path, function(pid) {
                if(pid) {
                    console.log('JetRunner client (' + self.name + ') - tunnel - already running (PID:' + (self.tunnel = pid) + ')');
                    connect();
                } else {
                    tunnel = self.tunnel = self.spawn();

                    console.log('JetRunner client (' + self.name + ') - tunnel - started (PID:' + tunnel.pid + ')');
                    console.log('Just give it a few of seconds...'.grey);

                    process.on('exit', self.disconnect.bind(self));

                    tunnel.on('close', self.onTunnelSevered.bind(self));

                    tunnel.stdout
                        .on('data', function(data) {
                            console.log(data);
                            self.isTunnelConnected(data) && connect();
                        })
                        .setEncoding('utf8');

                    tunnel.stderr
                        .on('data', function(data) { console.log(data); })
                        .setEncoding('utf8');
                }
            }.bind(this));
        } else {
            connect();
        }

        return this;
    },

    disconnect: function() {
        console.log('JetRunner client (' + this.name + ') - tunnel - shut down (PID:' + this.tunnel.pid + ')');
        this.tunnel.kill('SIGINT');
        return this.emit('disconnect');
    },

    /**
     * @param code
     *
     * TODO: Gracefully handle reporting and whatnot if tunnel connection is severed (which can happen from the web interface)
     */
    onTunnelSevered: function(code) {
        process.exit(code);
        return this;
    },

    /**
     * @abstract
     */
    spawn: function() {}

});

/**
 * @static
 * @param tunnel
 * @returns {boolean}
 */
TunnelClient.usingExistingProcess = function(tunnel) {
    return typeof tunnel === 'string';
};

/**
 * @static
 * @param file
 * @param callback
 * @returns {*}
 */
TunnelClient.getRunningProcessPID = function(file, callback) {
    callback = callback || function() {};
    if(!file) callback(0);
    else exec('ps ax|grep -v grep|grep ' + file, function(error, stdout, stderr) {
        if(error) callback(0);
        else callback((stdout.split(' ')[0]));
    });
    return this;
};

module.exports = TunnelClient;