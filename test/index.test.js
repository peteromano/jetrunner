var vows = require('vows'),
	assert = require('assert'),
    jetrunner = require('../lib');

vows.describe('JetRunner').addBatch({

	'unit test server': {
		topic: function() {
			return true
		},

		'can test itself': function(topic) {
			assert.equal(topic, true);
		}
	}

}).run();