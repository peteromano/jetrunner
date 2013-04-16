/** @module logger */

'use strict';

module.exports = {

    log: function() {
        return console.log.apply(console.log, arguments);
    }

};