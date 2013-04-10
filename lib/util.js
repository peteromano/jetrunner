'use strict';

var EventEmitter = require('events').EventEmitter;

module.exports = {

    merge: function() {
        var obj = arguments[0], args = Array.prototype.slice.call(arguments, 1);

        function copy(destination, source) {
            for (var property in source) {
                if (source[property] && source[property].constructor &&
                    source[property].constructor === Object) {
                    destination[property] = destination[property] || {};
                    copy(destination[property], source[property]);
                } else {
                    destination[property] = source[property];
                }
            }
            return destination;
        }

        for(var i in args) {
            copy(obj, args[i]);
        }

        return obj;
    },

    createEventEmitter: function(proto) {
        function F() {}
        this.merge(F.prototype, proto, (function() {
            var Events = function() {};
            Events.prototype = EventEmitter.prototype;
            return new Events();
        })());
        return new F();
    }

};