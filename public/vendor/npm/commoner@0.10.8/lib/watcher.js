/* */ 
(function(process) {
  var assert = require('assert');
  var path = require('path');
  var fs = require('graceful-fs');
  var spawn = require('child_process').spawn;
  var Q = require('q');
  var EventEmitter = require('events').EventEmitter;
  var ReadFileCache = require('./cache').ReadFileCache;
  var util = require('./util');
  var hasOwn = Object.prototype.hasOwnProperty;
  function Watcher(readFileCache, persistent) {
    assert.ok(this instanceof Watcher);
    assert.ok(this instanceof EventEmitter);
    assert.ok(readFileCache instanceof ReadFileCache);
    if (typeof persistent === "undefined") {
      persistent = true;
    }
    EventEmitter.call(this);
    var self = this;
    var sourceDir = readFileCache.sourceDir;
    var dirWatcher = new DirWatcher(sourceDir, persistent);
    Object.defineProperties(self, {
      sourceDir: {value: sourceDir},
      readFileCache: {value: readFileCache},
      dirWatcher: {value: dirWatcher}
    });
    readFileCache.subscribe(function(relativePath) {
      self.watch(relativePath);
    });
    readFileCache.on("changed", function(relativePath) {
      self.emit("changed", relativePath);
    });
    function handleDirEvent(event, relativePath) {
      if (self.dirWatcher.ready) {
        self.getFileHandler(relativePath)(event);
      }
    }
    dirWatcher.on("added", function(relativePath) {
      handleDirEvent("added", relativePath);
    }).on("deleted", function(relativePath) {
      handleDirEvent("deleted", relativePath);
    }).on("changed", function(relativePath) {
      handleDirEvent("changed", relativePath);
    });
  }
  util.inherits(Watcher, EventEmitter);
  var Wp = Watcher.prototype;
  Wp.watch = function(relativePath) {
    this.dirWatcher.add(path.dirname(path.join(this.sourceDir, relativePath)));
  };
  Wp.readFileP = function(relativePath) {
    return this.readFileCache.readFileP(relativePath);
  };
  Wp.noCacheReadFileP = function(relativePath) {
    return this.readFileCache.noCacheReadFileP(relativePath);
  };
  Wp.getFileHandler = util.cachedMethod(function(relativePath) {
    var self = this;
    return function handler(event) {
      self.readFileCache.reportPossiblyChanged(relativePath);
    };
  });
  function orNull(err) {
    return null;
  }
  Wp.close = function() {
    this.dirWatcher.close();
  };
  function DirWatcher(inputPath, persistent) {
    assert.ok(this instanceof DirWatcher);
    var self = this;
    var absPath = path.resolve(inputPath);
    if (!fs.statSync(absPath).isDirectory()) {
      throw new Error(inputPath + "is not a directory!");
    }
    EventEmitter.call(self);
    self.ready = false;
    self.on("ready", function() {
      self.ready = true;
    });
    Object.defineProperties(self, {
      watchers: {value: {}},
      dirContents: {value: {}},
      rootPath: {value: absPath},
      persistent: {value: !!persistent}
    });
    process.nextTick(function() {
      self.add(absPath);
      self.emit("ready");
    });
  }
  util.inherits(DirWatcher, EventEmitter);
  var DWp = DirWatcher.prototype;
  DWp.add = function(absDirPath) {
    var self = this;
    if (hasOwn.call(self.watchers, absDirPath)) {
      return;
    }
    self.watchers[absDirPath] = fs.watch(absDirPath, {persistent: this.persistent}).on("change", function(event, filename) {
      self.updateDirContents(absDirPath, event, filename);
    });
    self.updateDirContents(absDirPath);
    fs.readdirSync(absDirPath).forEach(function(filename) {
      var filepath = path.join(absDirPath, filename);
      if (fs.statSync(filepath).isDirectory()) {
        self.add(filepath);
      }
    });
  };
  DWp.updateDirContents = function(absDirPath, event, fsWatchReportedFilename) {
    var self = this;
    if (!hasOwn.call(self.dirContents, absDirPath)) {
      self.dirContents[absDirPath] = [];
    }
    var oldContents = self.dirContents[absDirPath];
    var newContents = fs.readdirSync(absDirPath);
    var deleted = {};
    var added = {};
    oldContents.forEach(function(filename) {
      deleted[filename] = true;
    });
    newContents.forEach(function(filename) {
      if (hasOwn.call(deleted, filename)) {
        delete deleted[filename];
      } else {
        added[filename] = true;
      }
    });
    var deletedNames = Object.keys(deleted);
    deletedNames.forEach(function(filename) {
      self.emit("deleted", path.relative(self.rootPath, path.join(absDirPath, filename)));
    });
    var addedNames = Object.keys(added);
    addedNames.forEach(function(filename) {
      self.emit("added", path.relative(self.rootPath, path.join(absDirPath, filename)));
    });
    if (fsWatchReportedFilename && !hasOwn.call(deleted, fsWatchReportedFilename) && !hasOwn.call(added, fsWatchReportedFilename)) {
      self.emit("changed", path.relative(self.rootPath, path.join(absDirPath, fsWatchReportedFilename)));
    }
    deletedNames.forEach(function(filename) {
      var filepath = path.join(absDirPath, filename);
      delete self.dirContents[filepath];
      delete self.watchers[filepath];
    });
    addedNames.forEach(function(filename) {
      var filepath = path.join(absDirPath, filename);
      if (fs.existsSync(filepath) && fs.statSync(filepath).isDirectory()) {
        self.add(filepath);
      }
    });
    self.dirContents[absDirPath] = newContents;
  };
  DWp.close = function() {
    var watchers = this.watchers;
    Object.keys(watchers).forEach(function(filename) {
      watchers[filename].close();
    });
  };
  exports.Watcher = Watcher;
})(require('process'));
