'use strict';

var util    = require('../util'),
    Client  = require('./client');

function TunnelClient(config) {}

TunnelClient.prototype = util.merge(new Client, {
    /**
     * Field to store the tunnel child process
     */
    tunnel: null,

    notices: {
        tunnelStartup:  '',
        tunnelShutdown: ''
    },

    initialize: function(config) {
        Client.prototype.initialize.call(this, config);
        return this.connectTunnel();
    },

    /**
     * @abstract
     * @returns {*}
     */
    connectTunnel: function() {
        return this;
    },

    disconnectTunnel: function() {
        console.log(this.notices.tunnelShutdown + ' (PID:' + this.tunnel.pid + ')');
        this.tunnel.kill('SIGINT');
        return this.emit('tunnel:disconnect');
    },

    /**
     * @param code
     *
     * TODO: Gracefully handle reporting and whatnot if tunnel connection is severed (which can happen from the web interface)
     */
    onTunnelSevered: function(code) {
        process.exit(code);
        return this;
    }

});

module.exports = TunnelClient;