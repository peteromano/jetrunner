require(['Person'], function (Person) {
  'use strict';

  var person;

  before(function(){
      person = new Person('Pete');
  });

  describe('Person', function(){

    describe('#getName()', function(){
      it('should be Pete', function(){
        expect(person.getName()).to.equal('Pete');
      });
    });

    describe('#sleep()', function(){
      it('should put Pete to sleep', function(){
        person.sleep();
        expect(person.isSleeping()).to.equal(true);
      });
    });

    describe('#wake()', function(){
      it('should wake Pete up', function(){
        person.wake();
        expect(person.isSleeping()).to.equal(false);
      });
    });

  });
});