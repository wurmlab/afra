define([
    'dojo/_base/declare',
    'JBrowse/Model/SimpleFeature'
]
, function(declare, SimpleFeature) {

var Stack = declare(null, {

    constructor: function (maxSize) {
        maxSize = maxSize || 32;
        this.data = [];
        this.maxSize = maxSize;
    },

    push: function (value) {
        this.data.push(value);
        if (this.data.length >= this.maxSize) {
            this.data.shift();
        }
        return this.length;
    },

    pop: function () {
        if (this.data.length > 0) {
            var val = this.data.pop();
            return val;
        }
        return null;
    },

    length: function () {
        return this.data.length;
    }
});

Stack.toJSON = function (stack) {
    var stackJSON = _.map(stack.data, function (item) {
        return _.map(item, function (feature) {
            return SimpleFeature.toJSON(feature);
        });
    });
    stackJSON = JSON.stringify(stackJSON);
    return stackJSON;
};

Stack.fromJSON = function (stackJSON) {
    var data  = JSON.parse(stackJSON);
    var stack = new Stack();
    stack.data = _.map(data, function (itemData) {
        return _.map(itemData, function (featureJSON) {
            return SimpleFeature.fromJSON(featureJSON);
        });
    });
    return stack;
};

return Stack;
});
