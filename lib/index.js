'use strict';

var util = require('./util');

module.exports = util.createEventEmitter({
    VERSION: require('../package.json').version,
    util: util,
    config: require('./config'),
    cli: require('./cli'),
    server: require('./server'),
    run: require('./run')
});