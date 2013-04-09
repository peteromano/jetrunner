var soda = require('soda');

soda.createSauceClient({
    'url': this,
    'username': saucelabs['username'],
    'access-key': saucelabs['access-key'],
    'max-duration': saucelabs['max-duration'],
    'browser-version': system['browser-version'],
    'os': system.os,
    'browser': system.browser
})
    .chain
    .session()
    .open(parsed.pathname + parsed.search)
    .waitForPageToLoad(10000)
    .testComplete()
    .setContext('sauce:job-result=passed')  // TODO: Implement reporting...
    .end(function(error) {
        jetrunner.emit('soda:end');
        done(+error);
    });