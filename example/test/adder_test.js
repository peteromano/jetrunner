'use strict';

describe('Adder', function(){

    describe('#add()', function(){

        it('should add.', function(){
            expect(Adder.add(2, 3)).to.equal(5);
        });

        it('should be associative.', function(){
            expect(Adder.add(3, 2)).to.equal(5);
        });

        it('should be not be absolute.', function(){
            expect(Adder.add(-3, 2)).to.equal(-1);
        });

    });

});