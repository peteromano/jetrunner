'use strict';

module.exports = function() {
    return this.util.readJSON(__dirname + '/../package.json').version;
};