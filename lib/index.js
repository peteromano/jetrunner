(function(undefined) {
    'use strict';

    function JetRunner() {};

    JetRunner.prototype = (function() {
        var Events = function() {};
        Events.prototype = require('events').EventEmitter.prototype
        return new Events;
    })();

    JetRunner.prototype.cli = require('./cli');
    JetRunner.prototype.server = require('./server');
    JetRunner.prototype.run = require('./run');
    JetRunner.prototype.util = require('./util');
    JetRunner.prototype.version = require('./version');

    module.exports = new JetRunner;

})(undefined);