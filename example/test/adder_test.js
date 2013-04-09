'use strict';

describe('adder', function(){

    describe('#add()', function(){

        it('should add.', function(){
            expect(Adder.add(1, 1)).to.equal(2);
        });

    });

});