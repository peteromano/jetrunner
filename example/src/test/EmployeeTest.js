require(['Employee'], function (Employee) {
  'use strict';

  var employee;

  before(function(){
      employee = new Employee('Pete', 'Engineer', '$1,000,000,000.00');
  });

  describe('Employee', function(){

    describe('#getPosition()', function(){
      it('should be an engineer', function(){
        expect(employee.getPosition()).to.equal('Engineer');
      });
    });

    describe('#getSalary()', function(){
      it('should be rich', function(){
        expect(employee.getSalary()).to.equal('$1,000,000,000.00');
      });
    });

  });
});