define('Person', function() {
    'use strict';

    var isSleeping = false;

    function Person(name) {
        this.name = name;
    }

    Person.prototype.getName = function() {
        return this.name;
    };

    Person.prototype.sleep = function() {
      isSleeping = true;
    };

    Person.prototype.wake = function() {
      isSleeping = false;
    };

    Person.prototype.isSleeping = function() {
      return isSleeping;
    };

    return Person;

});