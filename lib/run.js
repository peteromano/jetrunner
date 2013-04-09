'use strict';

module.exports = function(tests, config, callback) {
    if(typeof config === 'function') {
        callback = config;
        config = {};
    }

    this.server('start', this.util.merge(this.config, config || {}), function() {

        // TODO: Run clients........

    });

    return this;
};