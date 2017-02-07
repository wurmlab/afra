/* */ 
"format cjs";
(function(process) {
  define(["../has", "require"], function(has, require) {
    var result = {};
    if (has("dojo-config-api")) {
      var src = require.rawConfig,
          p;
      for (p in src) {
        result[p] = src[p];
      }
    } else {
      var adviseHas = function(featureSet, prefix, booting) {
        for (p in featureSet) {
          p != "has" && has.add(prefix + p, featureSet[p], 0, booting);
        }
      };
      var global = (function() {
        return this;
      })();
      result = has("dojo-loader") ? require.rawConfig : global.dojoConfig || global.djConfig || {};
      adviseHas(result, "config", 1);
      adviseHas(result.has, "", 1);
    }
    if (!result.locale && typeof navigator != "undefined") {
      result.locale = (navigator.language || navigator.userLanguage).toLowerCase();
    }
    return result;
  });
})(require('process'));
