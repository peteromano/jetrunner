(function(undefined) {
    'use strict';

    module.exports = function() {
        return JSON.parse(require('fs').readFileSync(__dirname + '/../package.json')).version;
    };

})(undefined);