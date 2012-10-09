var jetrunner = require('../lib/jetrunner'),
    assert = require('assert');

describe('#version()', function() {
    it('should be at 1.0.0pre{version}', function() {
        assert.ok(/1.0.0pre\d/.test(jetrunner.version()));
    })
});