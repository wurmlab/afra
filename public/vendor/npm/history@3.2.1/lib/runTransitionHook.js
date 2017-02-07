/* */ 
(function(process) {
  'use strict';
  exports.__esModule = true;
  var _warning = require('warning');
  var _warning2 = _interopRequireDefault(_warning);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  var runTransitionHook = function runTransitionHook(hook, location, callback) {
    var result = hook(location, callback);
    if (hook.length < 2) {
      callback(result);
    } else {
      process.env.NODE_ENV !== 'production' ? (0, _warning2.default)(result === undefined, 'You should not "return" in a transition hook with a callback argument; ' + 'call the callback instead') : void 0;
    }
  };
  exports.default = runTransitionHook;
})(require('process'));
