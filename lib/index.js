'use strict';

var colors  = require('colors'),
    pkg     = require('../package.json'),
    util    = require('./util');

process.title = pkg.name;

module.exports = util.createEventEmitter({
    util:       util,
    config:     require('./config'),
    cli:        require('./cli'),
    server:     require('./server'),
    run:        require('./run'),
    VERSION:    pkg.version
});