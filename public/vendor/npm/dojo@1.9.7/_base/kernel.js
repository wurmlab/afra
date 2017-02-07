/* */ 
"format cjs";
(function(process) {
  define(["../has", "./config", "require", "module"], function(has, config, require, module) {
    var i,
        p,
        global = (function() {
          return this;
        })(),
        dijit = {},
        dojox = {},
        dojo = {
          config: config,
          global: global,
          dijit: dijit,
          dojox: dojox
        };
    var scopeMap = {
      dojo: ["dojo", dojo],
      dijit: ["dijit", dijit],
      dojox: ["dojox", dojox]
    },
        packageMap = (require.map && require.map[module.id.match(/[^\/]+/)[0]]),
        item;
    for (p in packageMap) {
      if (scopeMap[p]) {
        scopeMap[p][0] = packageMap[p];
      } else {
        scopeMap[p] = [packageMap[p], {}];
      }
    }
    for (p in scopeMap) {
      item = scopeMap[p];
      item[1]._scopeName = item[0];
      if (!config.noGlobals) {
        global[item[0]] = item[1];
      }
    }
    dojo.scopeMap = scopeMap;
    dojo.baseUrl = dojo.config.baseUrl = require.baseUrl;
    dojo.isAsync = !has("dojo-loader") || require.async;
    dojo.locale = config.locale;
    var rev = "$Rev: 2dfbbaf $".match(/[0-9a-f]{7,}/);
    dojo.version = {
      major: 1,
      minor: 9,
      patch: 7,
      flag: "",
      revision: rev ? rev[0] : NaN,
      toString: function() {
        var v = dojo.version;
        return v.major + "." + v.minor + "." + v.patch + v.flag + " (" + v.revision + ")";
      }
    };
    has.add("extend-dojo", 1);
    (Function("d", "d.eval = function(){return d.global.eval ? d.global.eval(arguments[0]) : eval(arguments[0]);}"))(dojo);
    if (has("host-rhino")) {
      dojo.exit = function(exitcode) {
        quit(exitcode);
      };
    } else {
      dojo.exit = function() {};
    }
    has.add("dojo-guarantee-console", 1);
    if (has("dojo-guarantee-console")) {
      typeof console != "undefined" || (console = {});
      var cn = ["assert", "count", "debug", "dir", "dirxml", "error", "group", "groupEnd", "info", "profile", "profileEnd", "time", "timeEnd", "trace", "warn", "log"];
      var tn;
      i = 0;
      while ((tn = cn[i++])) {
        if (!console[tn]) {
          (function() {
            var tcn = tn + "";
            console[tcn] = ('log' in console) ? function() {
              var a = Array.prototype.slice.call(arguments);
              a.unshift(tcn + ":");
              console["log"](a.join(" "));
            } : function() {};
            console[tcn]._fake = true;
          })();
        }
      }
    }
    has.add("dojo-debug-messages", !!config.isDebug);
    dojo.deprecated = dojo.experimental = function() {};
    if (has("dojo-debug-messages")) {
      dojo.deprecated = function(behaviour, extra, removal) {
        var message = "DEPRECATED: " + behaviour;
        if (extra) {
          message += " " + extra;
        }
        if (removal) {
          message += " -- will be removed in version: " + removal;
        }
        console.warn(message);
      };
      dojo.experimental = function(moduleName, extra) {
        var message = "EXPERIMENTAL: " + moduleName + " -- APIs subject to change without notice.";
        if (extra) {
          message += " " + extra;
        }
        console.warn(message);
      };
    }
    has.add("dojo-modulePaths", 1);
    if (has("dojo-modulePaths")) {
      if (config.modulePaths) {
        dojo.deprecated("dojo.modulePaths", "use paths configuration");
        var paths = {};
        for (p in config.modulePaths) {
          paths[p.replace(/\./g, "/")] = config.modulePaths[p];
        }
        require({paths: paths});
      }
    }
    has.add("dojo-moduleUrl", 1);
    if (has("dojo-moduleUrl")) {
      dojo.moduleUrl = function(module, url) {
        dojo.deprecated("dojo.moduleUrl()", "use require.toUrl", "2.0");
        var result = null;
        if (module) {
          result = require.toUrl(module.replace(/\./g, "/") + (url ? ("/" + url) : "") + "/*.*").replace(/\/\*\.\*/, "") + (url ? "" : "/");
        }
        return result;
      };
    }
    dojo._hasResource = {};
    return dojo;
  });
})(require('process'));
