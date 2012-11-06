var jam = {
    "packages": [
        {
            "name": "chai",
            "location": "vendor/chai",
            "main": "chai/chai.js"
        },
        {
            "name": "espresso",
            "location": "vendor/espresso",
            "main": "espresso.compressed.js"
        },
        {
            "name": "jquery",
            "location": "vendor/jquery",
            "main": "jquery.js"
        },
        {
            "name": "mocha",
            "location": "vendor/mocha",
            "main": "mocha/mocha.js"
        }
    ],
    "version": "0.2.11",
    "shim": {}
};

if (typeof require !== "undefined" && require.config) {
    require.config({packages: jam.packages, shim: jam.shim});
}
else {
    var require = {packages: jam.packages, shim: jam.shim};
}

if (typeof exports !== "undefined" && typeof module !== "undefined") {
    module.exports = jam;
}