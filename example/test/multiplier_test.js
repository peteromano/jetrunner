'use strict';

describe('Multiplier', function(){

    describe('#multiply()', function(){

        it('should multiply.', function(){
            expect(Multiplier.multiply(4, 2)).to.equal(8);
        });

        it('should be associative.', function(){
            expect(Multiplier.multiply(2, 4)).to.equal(8);
        });

        it('should be zero if multiplying by zero.', function(){
            expect(Multiplier.multiply(2, 0)).to.equal(0);
        });

    });

});