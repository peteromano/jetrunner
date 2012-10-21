require(['./Person'], function(Person) {
    'use strict';

    describe('Person', function(){

      describe('true', function(){
        it('should be true', function(){
          expect(true).to.equal(true);
        });
      });

    });
});