/*global Application */
describe('Application', function(){
  'use strict';

  var app;

  before(function(){
      app = Application.getInstance();
  });

  describe('#Application()', function(){
    it('should return a single static instance', function(){
      expect(new Application()).to.equal(app);
    });
  });
});