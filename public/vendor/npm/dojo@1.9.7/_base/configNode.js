/* */ 
(function(process) {
  exports.config = function(config) {
    for (var deps = [],
        args = [],
        i = 0; i < process.argv.length; i++) {
      var arg = (process.argv[i] + "").split("=");
      if (arg[0] == "load") {
        deps.push(arg[1]);
      } else {
        args.push(arg);
      }
    }
    var fs = require('fs');
    var hasCache = {
      "host-node": 1,
      "host-browser": 0,
      "dom": 0,
      "dojo-has-api": 1,
      "dojo-xhr-factory": 0,
      "dojo-inject-api": 1,
      "dojo-timeout-api": 0,
      "dojo-trace-api": 1,
      "dojo-dom-ready-api": 0,
      "dojo-publish-privates": 1,
      "dojo-sniff": 0,
      "dojo-loader": 1,
      "dojo-test-xd": 0,
      "dojo-test-sniff": 0
    };
    for (var p in hasCache) {
      config.hasCache[p] = hasCache[p];
    }
    var vm = require('vm'),
        path = require('path');
    var nodeConfig = {
      baseUrl: path.dirname(process.argv[1]),
      commandLineArgs: args,
      deps: deps,
      timeout: 0,
      locale: "en-us",
      loaderPatch: {
        log: function(item) {
          var util = require('util');
          util.debug(util.inspect(item));
        },
        eval: function(__text, __urlHint) {
          return vm.runInThisContext(__text, __urlHint);
        },
        injectUrl: function(url, callback) {
          try {
            vm.runInThisContext(fs.readFileSync(url, "utf8"), url);
            callback();
          } catch (e) {
            this.log("failed to load resource (" + url + ")");
            this.log(e);
          }
        },
        getText: function(url, sync, onLoad) {
          onLoad(fs.readFileSync(url, "utf8"));
        }
      }
    };
    for (p in nodeConfig) {
      config[p] = nodeConfig[p];
    }
  };
})(require('process'));
