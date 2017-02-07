/* */ 
var test = require('tap').test;
var detective = require('../index');
var fs = require('fs');
var src = fs.readFileSync(__dirname + '/files/sparse-array.js');
test('sparse-array', function(t) {
  t.doesNotThrow(function() {
    detective(src);
  });
  t.end();
});
