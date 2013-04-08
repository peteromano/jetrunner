var DRIVER_PATH = '../../drivers/mocha-phantomjs/lib/mocha-phantomjs.coffee';

var path = require('path'),
    driver = path.resolve(__dirname + '/' + DRIVER_PATH);

util.puts('Testing ' + this + '...');

var phantom = spawn('phantomjs', [driver, this, reporter], { stdio: config.stdio || 'inherit' });

phantom.on('exit', function(code) {
    jetrunner.emit('phantom:exit');
    done(code);
});

phantom.stdout && phantom.stdout.on('data', function(data) {
    jetrunner.emit('phantom:stdout', '' + data);
});

phantom.stderr && phantom.stderr.on('data', function(data) {
    jetrunner.emit('phantom:stderr', '' + data);
});