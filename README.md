JetRunner. (the baddliest name in UNIT TESTING)
===============================================

### Who sayz you can't haz it all?

This package spins up a simple web server for you to test 1:1* pairings of JavaScript source, to unit test, files - conveniently.

\* The source file is actually not required; you can just run a stand-alone unit test file.

Full documentation is pending, but for now:

### System Requirements:
* node.js/npm
* [optional] PhantomJS (http://phantomjs.org/download.html) - If you want to run tests locally using the PhantomJS ("phantomjs") driver. (PhantomJS is optional - you can use JetRunner manually by running `jetrunner --server start` and just running each test "by hand" in your local browser.)
* [optional] BrowserStackTunnel - If you want to use the BrowserStack ("browserstack") driver, AND want to use the vendor-provided tunnel service (and is currently running.)
* [optional] SauceLabsConnect - If you want to use the SauceLabs Connect/Selenium Web Driver ("saucelabs") driver, AND want to use the vendor-provided tunnel service (and it's currently running.)
