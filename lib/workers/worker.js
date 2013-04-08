function next() {
    queue.length && queue.shift()();
}

function done(code) {
    if(queue.length && (code == 0 || config.continueOnFail)) next();
    else callback(code);
}

for(var test in tests) {
    queue.push(run.bind(url.format({
        protocol: protocol,
        host: remoteUrl || 'localhost:' + port,
        pathname: '/',
        query: {
            test: test,
            src: tests[test] || ''
        }
    })));
}

if(queue.length) next();
else callback(0);