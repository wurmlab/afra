/* */ 
"format cjs";
(function(process) {
  define(["./_base/kernel", "./has", "require", "./has!host-browser?./domReady", "./_base/lang"], function(dojo, has, require, domReady, lang) {
    var isDomReady = 0,
        loadQ = [],
        onLoadRecursiveGuard = 0,
        handleDomReady = function() {
          isDomReady = 1;
          dojo._postLoad = dojo.config.afterOnLoad = true;
          onEvent();
        },
        onEvent = function() {
          if (onLoadRecursiveGuard) {
            return;
          }
          onLoadRecursiveGuard = 1;
          while (isDomReady && (!domReady || domReady._Q.length == 0) && (require.idle ? require.idle() : true) && loadQ.length) {
            var f = loadQ.shift();
            try {
              f();
            } catch (e) {
              e.info = e.message;
              if (require.signal) {
                require.signal("error", e);
              } else {
                throw e;
              }
            }
          }
          onLoadRecursiveGuard = 0;
        };
    require.on && require.on("idle", onEvent);
    if (domReady) {
      domReady._onQEmpty = onEvent;
    }
    var ready = dojo.ready = dojo.addOnLoad = function(priority, context, callback) {
      var hitchArgs = lang._toArray(arguments);
      if (typeof priority != "number") {
        callback = context;
        context = priority;
        priority = 1000;
      } else {
        hitchArgs.shift();
      }
      callback = callback ? lang.hitch.apply(dojo, hitchArgs) : function() {
        context();
      };
      callback.priority = priority;
      for (var i = 0; i < loadQ.length && priority >= loadQ[i].priority; i++) {}
      loadQ.splice(i, 0, callback);
      onEvent();
    };
    has.add("dojo-config-addOnLoad", 1);
    if (has("dojo-config-addOnLoad")) {
      var dca = dojo.config.addOnLoad;
      if (dca) {
        ready[(lang.isArray(dca) ? "apply" : "call")](dojo, dca);
      }
    }
    if (has("dojo-sync-loader") && dojo.config.parseOnLoad && !dojo.isAsync) {
      ready(99, function() {
        if (!dojo.parser) {
          dojo.deprecated("Add explicit require(['dojo/parser']);", "", "2.0");
          require(["dojo/parser"]);
        }
      });
    }
    if (domReady) {
      domReady(handleDomReady);
    } else {
      handleDomReady();
    }
    return ready;
  });
})(require('process'));
