module.exports = (function(undefined) {

    var cli = {

            'server': function() {
                if(process.argv[3] == 'start') listen();
            }

        };

    function listen() {
        require('../server/app');
    }

    return {

        cli: function() {
            var cmd = cli[process.argv[2]];
            return cmd && cmd.apply(this) || this;
        },

        server: {

            start: function() {
                listen();
                return this;
            }

        }

    };

})(undefined);