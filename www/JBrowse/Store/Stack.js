define([
            'dojo/_base/declare'
        ],
        function(declare) {

var Stack = declare(null, {
    constructor: function (maxSize) {
        maxSize = maxSize || 32;
        this.stack = [];
        this.maxSize = maxSize;
    },

    push: function (value) {
        this.stack.push(value);
        if (this.stack.length >= this.maxSize) {
            this.stack.shift();
        }
        return this.length;
    },

    pop: function () {
        if (this.stack.length > 0) {
            var val = this.stack.pop();
            return val;
        }
        return null;
    },

    length: function () {
        return this.stack.length;
    }
});

return Stack;
});
