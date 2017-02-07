'use strict';

var react = require('react-tools');

exports.translate = function(load) {
	var output = react.transformWithDetails(load.source, { es6module: true, sourceMap: true });
	load.metadata.sourceMap = output.sourceMap;
	return output.code;
};
