/* */ 
(function(process) {
  'use strict';
  var __DEV__ = process.env.NODE_ENV !== 'production';
  var warning = function() {};
  if (__DEV__) {
    warning = function(condition, format, args) {
      var len = arguments.length;
      args = new Array(len > 2 ? len - 2 : 0);
      for (var key = 2; key < len; key++) {
        args[key - 2] = arguments[key];
      }
      if (format === undefined) {
        throw new Error('`warning(condition, format, ...args)` requires a warning ' + 'message argument');
      }
      if (format.length < 10 || (/^[s\W]*$/).test(format)) {
        throw new Error('The warning format should be able to uniquely identify this ' + 'warning. Please, use a more descriptive format than: ' + format);
      }
      if (!condition) {
        var argIndex = 0;
        var message = 'Warning: ' + format.replace(/%s/g, function() {
          return args[argIndex++];
        });
        if (typeof console !== 'undefined') {
          console.error(message);
        }
        try {
          throw new Error(message);
        } catch (x) {}
      }
    };
  }
  module.exports = warning;
})(require('process'));
