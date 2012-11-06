define('Employee', ['jquery', 'Person'], function($, Person) {
    'use strict';

    function Temp() {}

    Temp.prototype = Person.prototype;

    function Employee(name, position, salary) {
        this.name = name;
        this.position = position;
        this.salary = salary;
    }

    Employee.prototype = new Temp();

    Employee.prototype.getPosition = function() {
        return this.position;
    };

    Employee.prototype.getSalary = function() {
        return this.salary;
    };

    return Employee;

});