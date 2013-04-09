module.exports = {
    "secure": false,
    "port": process.env.PORT || 4444,
    "runner": {
        "debug": false,
        "base": process.cwd(),
        "engine": "jade",
        "template": __dirname + "/../templates/default.jade",
        "ui": "bdd",
        "styles": ["/vendor/mocha/mocha/mocha.css"],
        "scripts": [
            "/vendor/mocha/mocha/mocha.js",
            "/vendor/chai/chai/chai.js"
        ]
    },
    "client": {
        "driver": "phantomjs",
        "domain": "localhost",
        "reporter": "spec",
        "timeout": 2000
    }
};