requirejs.config({
    baseUrl: this.LIB_PATH || '/lib',
    shim: {},
    paths: {
        jquery: '/vendor/jquery/jquery'
    }
});
require(['jquery'], function($) {
    'use strict';

});