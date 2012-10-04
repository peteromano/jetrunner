(function(undefined) {
    'use strict';

    module.exports = {

        readJSON: function(file) {
            return JSON.parse(require('fs').readFileSync(file));
        }

    }

})(undefined);