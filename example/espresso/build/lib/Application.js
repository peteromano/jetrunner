espresso.Application('Application', function($, require, _, Backbone) {
    'use strict';

    /**
     * @lends site.Application.prototype
     */
    return {
        /**
         * @constructs
         * @description This class is a singleton
         * @augments espresso.framework.Application
         */
        Application: function() {},

        /**
         * @param {Object} config
         * @param {Object} context
         */
        initialize: function(config, context) {

        },

        ready: function() {

        }

    };

}, {

    Dependencies: [],

    Services: {
        basePath: 'services',
        autoload: ['Router'],
        registry: {
            Router: '{basePath}.Router'
        }
    },

    Configuration: {

        Default: {

            services: {

                Router: {}

            },

            espresso: {

                loader: {
                    libPath: '/lib',
                    vendorPath: '/vendor',
                    compressed: true
                }

            }

        }

    }

});