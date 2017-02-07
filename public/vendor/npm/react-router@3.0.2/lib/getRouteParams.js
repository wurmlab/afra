/* */ 
'use strict';
exports.__esModule = true;
var _PatternUtils = require('./PatternUtils');
function getRouteParams(route, params) {
  var routeParams = {};
  if (!route.path)
    return routeParams;
  (0, _PatternUtils.getParamNames)(route.path).forEach(function(p) {
    if (Object.prototype.hasOwnProperty.call(params, p)) {
      routeParams[p] = params[p];
    }
  });
  return routeParams;
}
exports.default = getRouteParams;
module.exports = exports['default'];
