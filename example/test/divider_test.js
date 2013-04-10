'use strict';

describe('Divider', function(){

    describe('#divide()', function(){

        it('should divide.', function(){
            expect(Divider.divide(4, 2)).to.equal(2);
        });

        it('should not be associative.', function(){
            expect(Divider.divide(2, 4)).to.equal(.5);
        });

        it('should not be able to divide by zero.', function(){
            expect(Divider.divide(2, 0)).to.equal(Infinity);
        });

    });

});