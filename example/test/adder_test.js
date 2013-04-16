'use strict';

describe('Adder', function(){

    describe('#add()', function(){

        it('should add.', function(done){
            done(Adder.add(2, 3) == 5 && null);
        });

        it('should be associative.', function(done){
            done(Adder.add(3, 2) == 5 && null);
        });

        it('should not be absolute.', function(done){
            done(Adder.add(-3, 2) == -1 && null);
        });

    });

});