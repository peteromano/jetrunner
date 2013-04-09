var path = require('path');

module.exports = {
    "debug": false,
    "secure": false,
    "port": process.env.PORT || 4444,
    "runner": {
        "base": process.cwd(),
        "engine": "jade",
        "template": path.resolve(__dirname + "/../templates/default.jade"),
        "discipline": "bdd",
        "styles": ["/vendor/mocha/mocha/mocha.css"],
        "scripts": [
            "/vendor/mocha/mocha/mocha.js",
            "/vendor/chai/chai/chai.js"
        ]
    },
    "client": {
        "driver": "phantomjs",
        "continueOnFail": false,
        "domain": "localhost",
        "reporter": "spec",
        "timeout": 2000
    }
};