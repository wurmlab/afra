/* */ 
var defaults = {
  parser: require('esprima'),
  tabWidth: 4,
  useTabs: false,
  reuseWhitespace: true,
  lineTerminator: require('os').EOL,
  wrapColumn: 74,
  sourceFileName: null,
  sourceMapName: null,
  sourceRoot: null,
  inputSourceMap: null,
  range: false,
  tolerant: true,
  quote: null,
  trailingComma: false,
  arrayBracketSpacing: false,
  objectCurlySpacing: true,
  arrowParensAlways: false,
  flowObjectCommas: true
},
    hasOwn = defaults.hasOwnProperty;
exports.normalize = function(options) {
  options = options || defaults;
  function get(key) {
    return hasOwn.call(options, key) ? options[key] : defaults[key];
  }
  return {
    tabWidth: +get("tabWidth"),
    useTabs: !!get("useTabs"),
    reuseWhitespace: !!get("reuseWhitespace"),
    lineTerminator: get("lineTerminator"),
    wrapColumn: Math.max(get("wrapColumn"), 0),
    sourceFileName: get("sourceFileName"),
    sourceMapName: get("sourceMapName"),
    sourceRoot: get("sourceRoot"),
    inputSourceMap: get("inputSourceMap"),
    parser: get("esprima") || get("parser"),
    range: get("range"),
    tolerant: get("tolerant"),
    quote: get("quote"),
    trailingComma: get("trailingComma"),
    arrayBracketSpacing: get("arrayBracketSpacing"),
    objectCurlySpacing: get("objectCurlySpacing"),
    arrowParensAlways: get("arrowParensAlways"),
    flowObjectCommas: get("flowObjectCommas")
  };
};
