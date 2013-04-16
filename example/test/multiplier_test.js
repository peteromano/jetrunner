'use strict';

describe('Multiplier', function(){

    describe('#multiply()', function(){

        it('should multiply.', function(done){
            done(Multiplier.multiply(4, 2) == 8 && null);
        });

        it('should be associative.', function(done){
            done(Multiplier.multiply(2, 4) == 8 && null);
        });

        it('should be zero if multiplying by zero.', function(done){
            done(Multiplier.multiply(2, 0) == 0 && null);
        });

    });

});