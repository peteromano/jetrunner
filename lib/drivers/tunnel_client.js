/** @module drivers/tunnel_client */

'use strict';

var exec    = require('child_process').exec,
    util    = require('../util'),
    Logger  = require('../logger'),
    Client  = require('./client');

/**
 * @abstract
 * @param config
 * @constructor
 */
function TunnelClient(tests, config) {}

TunnelClient.prototype = util.merge(new Client, {
    /**
     * Field to store the tunnel child process (or PID if tunnel is already running)
     */
    tunnel: null,

    initialize: function(tests, config) {
        Client.prototype.initialize.call(this, tests, config);
        return this.connect();
    },

    connect: function() {
        var self = this,
            client = this.config.client,
            tunnel;

        function connect() {
            self.emit('connect');
            self.on('newListenener', function(event, listener) {
                if(event === 'connect') {
                    self.emit('connect');
                }
            });
        }

        if(client.tunnel.enabled) {
            TunnelClient.getRunningPID(client.tunnel.path, function(pid) {
                if(pid && !client.tunnel.forceNew) {
                    Logger.log('JetRunner client (' + self.name + ') - tunnel - already running (PID:' + (self.tunnel = pid) + ')');
                    connect();
                } else {
                    process.on('exit', self.disconnect.bind(self));

                    tunnel = self.tunnel = self._spawn().on('close', function(code) {
                        self.emit('complete', TunnelClient.TestStatusEnum.FAIL_SEVERED);
                    });

                    tunnel.stdout
                        .on('data', function(data) {
                            Logger.log(data);
                            self.isConnected(data) && connect();
                        })
                        .setEncoding('utf8');

                    tunnel.stderr
                        .on('data', function(data) { Logger.log(data); })
                        .setEncoding('utf8');

                    Logger.log('JetRunner client (' + self.name + ') - tunnel - started (PID:' + tunnel.pid + ')');
                    Logger.log('Opening tunnel connection. Just give it a few of seconds...'.grey);
                }
            }.bind(this));
        } else {
            connect();
        }

        return this;
    },

    disconnect: function() {
        Logger.log('JetRunner client (' + this.name + ') - tunnel - shut down (PID:' + this.tunnel.pid + ')');
        this.tunnel.kill('SIGINT');
        return this.emit('disconnect');
    },

    /**
     * @abstract
     */
    _spawn: function() {}

});

/**
 * @static
 * @type {{FAIL: number}}
 */
TunnelClient.TestStatusEnum = {
    FAIL_SEVERED: 11
};

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
TunnelClient.getRunningPID = function(file, callback) {
    callback = callback || function() {};
    if(!file) callback(null);
    else exec('ps ax|grep -v grep|grep ' + file, function(error, stdout, stderr) {
        if(error) callback(null);
        else callback((stdout.replace(/^\s*/, '').split(' ')[0]));
    });
    return this;
};

module.exports = TunnelClient;