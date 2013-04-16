/** @module config */

'use strict';

var path = require('path');

module.exports = {
    "debug": false,
    "secure": false,
    "port": process.env.PORT || 4000,
    "runner": {
        "base": process.cwd(),
        "engine": "jade",
        "template": path.resolve(__dirname + "/../templates/default-bdd.jade"),
        "method": "bdd"
    },
    "client": {
        "driver": "phantomjs",
        "continueOnFail": false,
        "domain": "localhost",
        "reporter": "tap",
        "timeout": 2000,
        "tunnel": {
            "enabled": false,
            "forceNew": false
        }
    }
};