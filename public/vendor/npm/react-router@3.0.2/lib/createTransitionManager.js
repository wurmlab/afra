/* */ 
(function(process) {
  'use strict';
  exports.__esModule = true;
  var _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  exports.default = createTransitionManager;
  var _routerWarning = require('./routerWarning');
  var _routerWarning2 = _interopRequireDefault(_routerWarning);
  var _computeChangedRoutes2 = require('./computeChangedRoutes');
  var _computeChangedRoutes3 = _interopRequireDefault(_computeChangedRoutes2);
  var _TransitionUtils = require('./TransitionUtils');
  var _isActive2 = require('./isActive');
  var _isActive3 = _interopRequireDefault(_isActive2);
  var _getComponents = require('./getComponents');
  var _getComponents2 = _interopRequireDefault(_getComponents);
  var _matchRoutes = require('./matchRoutes');
  var _matchRoutes2 = _interopRequireDefault(_matchRoutes);
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  function hasAnyProperties(object) {
    for (var p in object) {
      if (Object.prototype.hasOwnProperty.call(object, p))
        return true;
    }
    return false;
  }
  function createTransitionManager(history, routes) {
    var state = {};
    function isActive(location, indexOnly) {
      location = history.createLocation(location);
      return (0, _isActive3.default)(location, indexOnly, state.location, state.routes, state.params);
    }
    var partialNextState = void 0;
    function match(location, callback) {
      if (partialNextState && partialNextState.location === location) {
        finishMatch(partialNextState, callback);
      } else {
        (0, _matchRoutes2.default)(routes, location, function(error, nextState) {
          if (error) {
            callback(error);
          } else if (nextState) {
            finishMatch(_extends({}, nextState, {location: location}), callback);
          } else {
            callback();
          }
        });
      }
    }
    function finishMatch(nextState, callback) {
      var _computeChangedRoutes = (0, _computeChangedRoutes3.default)(state, nextState),
          leaveRoutes = _computeChangedRoutes.leaveRoutes,
          changeRoutes = _computeChangedRoutes.changeRoutes,
          enterRoutes = _computeChangedRoutes.enterRoutes;
      (0, _TransitionUtils.runLeaveHooks)(leaveRoutes, state);
      leaveRoutes.filter(function(route) {
        return enterRoutes.indexOf(route) === -1;
      }).forEach(removeListenBeforeHooksForRoute);
      (0, _TransitionUtils.runChangeHooks)(changeRoutes, state, nextState, function(error, redirectInfo) {
        if (error || redirectInfo)
          return handleErrorOrRedirect(error, redirectInfo);
        (0, _TransitionUtils.runEnterHooks)(enterRoutes, nextState, finishEnterHooks);
      });
      function finishEnterHooks(error, redirectInfo) {
        if (error || redirectInfo)
          return handleErrorOrRedirect(error, redirectInfo);
        (0, _getComponents2.default)(nextState, function(error, components) {
          if (error) {
            callback(error);
          } else {
            callback(null, null, state = _extends({}, nextState, {components: components}));
          }
        });
      }
      function handleErrorOrRedirect(error, redirectInfo) {
        if (error)
          callback(error);
        else
          callback(null, redirectInfo);
      }
    }
    var RouteGuid = 1;
    function getRouteID(route) {
      var create = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      return route.__id__ || create && (route.__id__ = RouteGuid++);
    }
    var RouteHooks = Object.create(null);
    function getRouteHooksForRoutes(routes) {
      return routes.map(function(route) {
        return RouteHooks[getRouteID(route)];
      }).filter(function(hook) {
        return hook;
      });
    }
    function transitionHook(location, callback) {
      (0, _matchRoutes2.default)(routes, location, function(error, nextState) {
        if (nextState == null) {
          callback();
          return;
        }
        partialNextState = _extends({}, nextState, {location: location});
        var hooks = getRouteHooksForRoutes((0, _computeChangedRoutes3.default)(state, partialNextState).leaveRoutes);
        var result = void 0;
        for (var i = 0,
            len = hooks.length; result == null && i < len; ++i) {
          result = hooks[i](location);
        }
        callback(result);
      });
    }
    function beforeUnloadHook() {
      if (state.routes) {
        var hooks = getRouteHooksForRoutes(state.routes);
        var message = void 0;
        for (var i = 0,
            len = hooks.length; typeof message !== 'string' && i < len; ++i) {
          message = hooks[i]();
        }
        return message;
      }
    }
    var unlistenBefore = void 0,
        unlistenBeforeUnload = void 0;
    function removeListenBeforeHooksForRoute(route) {
      var routeID = getRouteID(route);
      if (!routeID) {
        return;
      }
      delete RouteHooks[routeID];
      if (!hasAnyProperties(RouteHooks)) {
        if (unlistenBefore) {
          unlistenBefore();
          unlistenBefore = null;
        }
        if (unlistenBeforeUnload) {
          unlistenBeforeUnload();
          unlistenBeforeUnload = null;
        }
      }
    }
    function listenBeforeLeavingRoute(route, hook) {
      var thereWereNoRouteHooks = !hasAnyProperties(RouteHooks);
      var routeID = getRouteID(route, true);
      RouteHooks[routeID] = hook;
      if (thereWereNoRouteHooks) {
        unlistenBefore = history.listenBefore(transitionHook);
        if (history.listenBeforeUnload)
          unlistenBeforeUnload = history.listenBeforeUnload(beforeUnloadHook);
      }
      return function() {
        removeListenBeforeHooksForRoute(route);
      };
    }
    function listen(listener) {
      function historyListener(location) {
        if (state.location === location) {
          listener(null, state);
        } else {
          match(location, function(error, redirectLocation, nextState) {
            if (error) {
              listener(error);
            } else if (redirectLocation) {
              history.replace(redirectLocation);
            } else if (nextState) {
              listener(null, nextState);
            } else {
              process.env.NODE_ENV !== 'production' ? (0, _routerWarning2.default)(false, 'Location "%s" did not match any routes', location.pathname + location.search + location.hash) : void 0;
            }
          });
        }
      }
      var unsubscribe = history.listen(historyListener);
      if (state.location) {
        listener(null, state);
      } else {
        historyListener(history.getCurrentLocation());
      }
      return unsubscribe;
    }
    return {
      isActive: isActive,
      match: match,
      listenBeforeLeavingRoute: listenBeforeLeavingRoute,
      listen: listen
    };
  }
  module.exports = exports['default'];
})(require('process'));
