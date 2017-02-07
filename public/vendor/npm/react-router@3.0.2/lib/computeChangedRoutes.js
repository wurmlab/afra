/* */ 
'use strict';
exports.__esModule = true;
var _PatternUtils = require('./PatternUtils');
function routeParamsChanged(route, prevState, nextState) {
  if (!route.path)
    return false;
  var paramNames = (0, _PatternUtils.getParamNames)(route.path);
  return paramNames.some(function(paramName) {
    return prevState.params[paramName] !== nextState.params[paramName];
  });
}
function computeChangedRoutes(prevState, nextState) {
  var prevRoutes = prevState && prevState.routes;
  var nextRoutes = nextState.routes;
  var leaveRoutes = void 0,
      changeRoutes = void 0,
      enterRoutes = void 0;
  if (prevRoutes) {
    (function() {
      var parentIsLeaving = false;
      leaveRoutes = prevRoutes.filter(function(route) {
        if (parentIsLeaving) {
          return true;
        } else {
          var isLeaving = nextRoutes.indexOf(route) === -1 || routeParamsChanged(route, prevState, nextState);
          if (isLeaving)
            parentIsLeaving = true;
          return isLeaving;
        }
      });
      leaveRoutes.reverse();
      enterRoutes = [];
      changeRoutes = [];
      nextRoutes.forEach(function(route) {
        var isNew = prevRoutes.indexOf(route) === -1;
        var paramsChanged = leaveRoutes.indexOf(route) !== -1;
        if (isNew || paramsChanged)
          enterRoutes.push(route);
        else
          changeRoutes.push(route);
      });
    })();
  } else {
    leaveRoutes = [];
    changeRoutes = [];
    enterRoutes = nextRoutes;
  }
  return {
    leaveRoutes: leaveRoutes,
    changeRoutes: changeRoutes,
    enterRoutes: enterRoutes
  };
}
exports.default = computeChangedRoutes;
module.exports = exports['default'];
