(function(undefined) {
    'use strict';

    module.exports = function() {
        return require('./util').readJSON(__dirname + '/../package.json').version;
    };

})(undefined);