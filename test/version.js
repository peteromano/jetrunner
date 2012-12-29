var jetrunner = require('../lib/jetrunner'),
    assert = require('assert');

describe('#version()', function() {
    it('should be at 1.x', function() {
        assert.ok(/1.\d/.test(jetrunner.version()));
    })
});