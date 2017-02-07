/* */ 
'use strict';
exports.__esModule = true;
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
  return typeof obj;
} : function(obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};
exports.default = isActive;
var _PatternUtils = require('./PatternUtils');
function deepEqual(a, b) {
  if (a == b)
    return true;
  if (a == null || b == null)
    return false;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every(function(item, index) {
      return deepEqual(item, b[index]);
    });
  }
  if ((typeof a === 'undefined' ? 'undefined' : _typeof(a)) === 'object') {
    for (var p in a) {
      if (!Object.prototype.hasOwnProperty.call(a, p)) {
        continue;
      }
      if (a[p] === undefined) {
        if (b[p] !== undefined) {
          return false;
        }
      } else if (!Object.prototype.hasOwnProperty.call(b, p)) {
        return false;
      } else if (!deepEqual(a[p], b[p])) {
        return false;
      }
    }
    return true;
  }
  return String(a) === String(b);
}
function pathIsActive(pathname, currentPathname) {
  if (currentPathname.charAt(0) !== '/') {
    currentPathname = '/' + currentPathname;
  }
  if (pathname.charAt(pathname.length - 1) !== '/') {
    pathname += '/';
  }
  if (currentPathname.charAt(currentPathname.length - 1) !== '/') {
    currentPathname += '/';
  }
  return currentPathname === pathname;
}
function routeIsActive(pathname, routes, params) {
  var remainingPathname = pathname,
      paramNames = [],
      paramValues = [];
  for (var i = 0,
      len = routes.length; i < len; ++i) {
    var route = routes[i];
    var pattern = route.path || '';
    if (pattern.charAt(0) === '/') {
      remainingPathname = pathname;
      paramNames = [];
      paramValues = [];
    }
    if (remainingPathname !== null && pattern) {
      var matched = (0, _PatternUtils.matchPattern)(pattern, remainingPathname);
      if (matched) {
        remainingPathname = matched.remainingPathname;
        paramNames = [].concat(paramNames, matched.paramNames);
        paramValues = [].concat(paramValues, matched.paramValues);
      } else {
        remainingPathname = null;
      }
      if (remainingPathname === '') {
        return paramNames.every(function(paramName, index) {
          return String(paramValues[index]) === String(params[paramName]);
        });
      }
    }
  }
  return false;
}
function queryIsActive(query, activeQuery) {
  if (activeQuery == null)
    return query == null;
  if (query == null)
    return true;
  return deepEqual(query, activeQuery);
}
function isActive(_ref, indexOnly, currentLocation, routes, params) {
  var pathname = _ref.pathname,
      query = _ref.query;
  if (currentLocation == null)
    return false;
  if (pathname.charAt(0) !== '/') {
    pathname = '/' + pathname;
  }
  if (!pathIsActive(pathname, currentLocation.pathname)) {
    if (indexOnly || !routeIsActive(pathname, routes, params)) {
      return false;
    }
  }
  return queryIsActive(query, currentLocation.query);
}
module.exports = exports['default'];
