/* */ 
(function(process) {
  'use strict';
  exports.__esModule = true;
  var _react = require('react');
  var _react2 = _interopRequireDefault(_react);
  var _invariant = require('invariant');
  var _invariant2 = _interopRequireDefault(_invariant);
  var _RouteUtils = require('./RouteUtils');
  var _InternalPropTypes = require('./InternalPropTypes');
  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
  }
  var _React$PropTypes = _react2.default.PropTypes,
      string = _React$PropTypes.string,
      func = _React$PropTypes.func;
  var Route = _react2.default.createClass({
    displayName: 'Route',
    statics: {createRouteFromReactElement: _RouteUtils.createRouteFromReactElement},
    propTypes: {
      path: string,
      component: _InternalPropTypes.component,
      components: _InternalPropTypes.components,
      getComponent: func,
      getComponents: func
    },
    render: function render() {
      !false ? process.env.NODE_ENV !== 'production' ? (0, _invariant2.default)(false, '<Route> elements are for router configuration only and should not be rendered') : (0, _invariant2.default)(false) : void 0;
    }
  });
  exports.default = Route;
  module.exports = exports['default'];
})(require('process'));
