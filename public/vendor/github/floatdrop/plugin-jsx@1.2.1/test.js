var assert = require('assert');
var code = require('fs').readFileSync('./sample.js');
assert.ok(/React\.createElement/.test(code));
