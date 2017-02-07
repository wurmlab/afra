/* */ 
"format cjs";
(function(process) {
  define(["require", "module"], function(require, module) {
    var has = require.has || function() {};
    if (!has("dojo-has-api")) {
      var isBrowser = typeof window != "undefined" && typeof location != "undefined" && typeof document != "undefined" && window.location == location && window.document == document,
          global = (function() {
            return this;
          })(),
          doc = isBrowser && document,
          element = doc && doc.createElement("DiV"),
          cache = (module.config && module.config()) || {};
      has = function(name) {
        return typeof cache[name] == "function" ? (cache[name] = cache[name](global, doc, element)) : cache[name];
      };
      has.cache = cache;
      has.add = function(name, test, now, force) {
        (typeof cache[name] == "undefined" || force) && (cache[name] = test);
        return now && has(name);
      };
      has.add("host-browser", isBrowser);
      has.add("host-node", (typeof process == "object" && process.versions && process.versions.node && process.versions.v8));
      has.add("host-rhino", (typeof load == "function" && (typeof Packages == "function" || typeof Packages == "object")));
      has.add("dom", isBrowser);
      has.add("dojo-dom-ready-api", 1);
      has.add("dojo-sniff", 1);
    }
    if (has("host-browser")) {
      has.add("dom-addeventlistener", !!document.addEventListener);
      has.add("touch", "ontouchstart" in document || window.navigator.msMaxTouchPoints > 0);
      has.add("device-width", screen.availWidth || innerWidth);
      var form = document.createElement("form");
      has.add("dom-attributes-explicit", form.attributes.length == 0);
      has.add("dom-attributes-specified-flag", form.attributes.length > 0 && form.attributes.length < 40);
    }
    has.clearElement = function(element) {
      element.innerHTML = "";
      return element;
    };
    has.normalize = function(id, toAbsMid) {
      var tokens = id.match(/[\?:]|[^:\?]*/g),
          i = 0,
          get = function(skip) {
            var term = tokens[i++];
            if (term == ":") {
              return 0;
            } else {
              if (tokens[i++] == "?") {
                if (!skip && has(term)) {
                  return get();
                } else {
                  get(true);
                  return get(skip);
                }
              }
              return term || 0;
            }
          };
      id = get();
      return id && toAbsMid(id);
    };
    has.load = function(id, parentRequire, loaded) {
      if (id) {
        parentRequire([id], loaded);
      } else {
        loaded();
      }
    };
    return has;
  });
})(require('process'));
