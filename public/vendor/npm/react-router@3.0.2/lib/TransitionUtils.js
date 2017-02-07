/* */ 
'use strict';
exports.__esModule = true;
exports.runEnterHooks = runEnterHooks;
exports.runChangeHooks = runChangeHooks;
exports.runLeaveHooks = runLeaveHooks;
var _AsyncUtils = require('./AsyncUtils');
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
var PendingHooks = function PendingHooks() {
  var _this = this;
  _classCallCheck(this, PendingHooks);
  this.hooks = [];
  this.add = function(hook) {
    return _this.hooks.push(hook);
  };
  this.remove = function(hook) {
    return _this.hooks = _this.hooks.filter(function(h) {
      return h !== hook;
    });
  };
  this.has = function(hook) {
    return _this.hooks.indexOf(hook) !== -1;
  };
  this.clear = function() {
    return _this.hooks = [];
  };
};
var enterHooks = new PendingHooks();
var changeHooks = new PendingHooks();
function createTransitionHook(hook, route, asyncArity, pendingHooks) {
  var isSync = hook.length < asyncArity;
  var transitionHook = function transitionHook() {
    for (var _len = arguments.length,
        args = Array(_len),
        _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    hook.apply(route, args);
    if (isSync) {
      var callback = args[args.length - 1];
      callback();
    }
  };
  pendingHooks.add(transitionHook);
  return transitionHook;
}
function getEnterHooks(routes) {
  return routes.reduce(function(hooks, route) {
    if (route.onEnter)
      hooks.push(createTransitionHook(route.onEnter, route, 3, enterHooks));
    return hooks;
  }, []);
}
function getChangeHooks(routes) {
  return routes.reduce(function(hooks, route) {
    if (route.onChange)
      hooks.push(createTransitionHook(route.onChange, route, 4, changeHooks));
    return hooks;
  }, []);
}
function runTransitionHooks(length, iter, callback) {
  if (!length) {
    callback();
    return;
  }
  var redirectInfo = void 0;
  function replace(location) {
    redirectInfo = location;
  }
  (0, _AsyncUtils.loopAsync)(length, function(index, next, done) {
    iter(index, replace, function(error) {
      if (error || redirectInfo) {
        done(error, redirectInfo);
      } else {
        next();
      }
    });
  }, callback);
}
function runEnterHooks(routes, nextState, callback) {
  enterHooks.clear();
  var hooks = getEnterHooks(routes);
  return runTransitionHooks(hooks.length, function(index, replace, next) {
    var wrappedNext = function wrappedNext() {
      if (enterHooks.has(hooks[index])) {
        next.apply(undefined, arguments);
        enterHooks.remove(hooks[index]);
      }
    };
    hooks[index](nextState, replace, wrappedNext);
  }, callback);
}
function runChangeHooks(routes, state, nextState, callback) {
  changeHooks.clear();
  var hooks = getChangeHooks(routes);
  return runTransitionHooks(hooks.length, function(index, replace, next) {
    var wrappedNext = function wrappedNext() {
      if (changeHooks.has(hooks[index])) {
        next.apply(undefined, arguments);
        changeHooks.remove(hooks[index]);
      }
    };
    hooks[index](state, nextState, replace, wrappedNext);
  }, callback);
}
function runLeaveHooks(routes, prevState) {
  for (var i = 0,
      len = routes.length; i < len; ++i) {
    if (routes[i].onLeave)
      routes[i].onLeave.call(routes[i], prevState);
  }
}
