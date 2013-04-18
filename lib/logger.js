/** @module logger */

'use strict';

module.exports = {

    log: function() {
        return console.log.apply(console.log, arguments);
    },

    error: function() {
        return this.log.apply(this, arguments);
    }

};