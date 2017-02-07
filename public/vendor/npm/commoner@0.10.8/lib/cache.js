/* */ 
var assert = require('assert');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var util = require('./util');
var EventEmitter = require('events').EventEmitter;
var hasOwn = Object.prototype.hasOwnProperty;
function ReadFileCache(sourceDir, charset) {
  assert.ok(this instanceof ReadFileCache);
  assert.strictEqual(typeof sourceDir, "string");
  this.charset = charset;
  EventEmitter.call(this);
  Object.defineProperties(this, {
    sourceDir: {value: sourceDir},
    sourceCache: {value: {}}
  });
}
util.inherits(ReadFileCache, EventEmitter);
var RFCp = ReadFileCache.prototype;
RFCp.readFileP = function(relativePath) {
  var cache = this.sourceCache;
  relativePath = path.normalize(relativePath);
  return hasOwn.call(cache, relativePath) ? cache[relativePath] : this.noCacheReadFileP(relativePath);
};
RFCp.noCacheReadFileP = function(relativePath) {
  relativePath = path.normalize(relativePath);
  var added = !hasOwn.call(this.sourceCache, relativePath);
  var promise = this.sourceCache[relativePath] = util.readFileP(path.join(this.sourceDir, relativePath), this.charset);
  if (added) {
    this.emit("added", relativePath);
  }
  return promise;
};
RFCp.reportPossiblyChanged = function(relativePath) {
  var self = this;
  var cached = self.readFileP(relativePath);
  var fresh = self.noCacheReadFileP(relativePath);
  Q.spread([cached.catch(orNull), fresh.catch(orNull)], function(oldData, newData) {
    if (oldData !== newData) {
      self.emit("changed", relativePath);
    }
  }).done();
};
RFCp.subscribe = function(callback, context) {
  for (var relativePath in this.sourceCache) {
    if (hasOwn.call(this.sourceCache, relativePath)) {
      callback.call(context || null, relativePath);
    }
  }
  this.on("added", function(relativePath) {
    callback.call(context || null, relativePath);
  });
};
RFCp.clear = function() {
  this.removeAllListeners();
  for (var relativePath in this.sourceCache) {
    delete this.sourceCache[relativePath];
  }
};
function orNull(err) {
  return null;
}
exports.ReadFileCache = ReadFileCache;
