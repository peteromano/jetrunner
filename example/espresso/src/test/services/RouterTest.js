/*global services */
describe('services.Router', function(){
  'use strict';

  var router;

  before(function(){
      router = services.Router.getInstance();
  });

  describe('#Router()', function(){
    it('should return a single static instance', function(){
      expect(new services.Router()).to.equal(router);
    });
  });
});