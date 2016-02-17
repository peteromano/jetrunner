JetRunner
=========

DEPRECATED: The front-end unit testing landscape has evolved since the development of this library. Check out [Karma](http://karma-runner.github.io/0.13/index.html)

Run unit test suites locally or in the cloud, in parallel, and report back to an adapter (i.e., TAP output for Jenkins build decisions.)

### Dependencies:
* [optional] PhantomJS (http://phantomjs.org/download.html) - If you want to run tests locally using the PhantomJS ("phantomjs") driver. (PhantomJS is optional - you can use JetRunner manually by running `jetrunner --server start` and just running each test "by hand" in your local browser.)
* [optional] BrowserStackTunnel - If you want to use the BrowserStack ("browserstack") driver, AND want to use the vendor-provided tunnel service (and is currently running.)
* [optional] SauceLabsConnect - If you want to use the SauceLabs Connect/Selenium Web Driver ("saucelabs") driver, AND want to use the vendor-provided tunnel service (and it's currently running.)
