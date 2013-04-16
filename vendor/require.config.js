var jam = {
    "packages": [
        {
            "name": "chai",
            "location": "vendor/chai",
            "main": "./index"
        },
        {
            "name": "json3",
            "location": "vendor/json3",
            "main": "./lib/json3.min"
        },
        {
            "name": "mocha",
            "location": "vendor/mocha",
            "main": "./index"
        },
        {
            "name": "sinon",
            "location": "vendor/sinon",
            "main": "sinon.js"
        }
    ],
    "version": "0.2.17",
    "shim": {
        "sinon": {
            "exports": "sinon"
        }
    }
};

if (typeof require !== "undefined" && require.config) {
    require.config({
    "packages": [
        {
            "name": "chai",
            "location": "vendor/chai",
            "main": "./index"
        },
        {
            "name": "json3",
            "location": "vendor/json3",
            "main": "./lib/json3.min"
        },
        {
            "name": "mocha",
            "location": "vendor/mocha",
            "main": "./index"
        },
        {
            "name": "sinon",
            "location": "vendor/sinon",
            "main": "sinon.js"
        }
    ],
    "shim": {
        "sinon": {
            "exports": "sinon"
        }
    }
});
}
else {
    var require = {
    "packages": [
        {
            "name": "chai",
            "location": "vendor/chai",
            "main": "./index"
        },
        {
            "name": "json3",
            "location": "vendor/json3",
            "main": "./lib/json3.min"
        },
        {
            "name": "mocha",
            "location": "vendor/mocha",
            "main": "./index"
        },
        {
            "name": "sinon",
            "location": "vendor/sinon",
            "main": "sinon.js"
        }
    ],
    "shim": {
        "sinon": {
            "exports": "sinon"
        }
    }
};
}

if (typeof exports !== "undefined" && typeof module !== "undefined") {
    module.exports = jam;
}