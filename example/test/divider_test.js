'use strict';

describe('Divider', function(){

    describe('#divide()', function(){

        it('should divide.', function(done){
            done(Divider.divide(4, 2) == 2 && null);
        });

        it('should not be associative.', function(done){
            done(Divider.divide(2, 4) == .5 && null);
        });

        it('should not be able to divide by zero.', function(done){
            done(Divider.divide(2, 0) === Infinity && null);
        });

    });

});