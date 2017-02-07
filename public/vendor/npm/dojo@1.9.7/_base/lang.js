/* */ 
"format cjs";
(function(process) {
  define(["./kernel", "../has", "../sniff"], function(dojo, has) {
    has.add("bug-for-in-skips-shadowed", function() {
      for (var i in {toString: 1}) {
        return 0;
      }
      return 1;
    });
    var _extraNames = has("bug-for-in-skips-shadowed") ? "hasOwnProperty.valueOf.isPrototypeOf.propertyIsEnumerable.toLocaleString.toString.constructor".split(".") : [],
        _extraLen = _extraNames.length,
        getProp = function(parts, create, context) {
          var p,
              i = 0,
              dojoGlobal = dojo.global;
          if (!context) {
            if (!parts.length) {
              return dojoGlobal;
            } else {
              p = parts[i++];
              try {
                context = dojo.scopeMap[p] && dojo.scopeMap[p][1];
              } catch (e) {}
              context = context || (p in dojoGlobal ? dojoGlobal[p] : (create ? dojoGlobal[p] = {} : undefined));
            }
          }
          while (context && (p = parts[i++])) {
            context = (p in context ? context[p] : (create ? context[p] = {} : undefined));
          }
          return context;
        },
        opts = Object.prototype.toString,
        efficient = function(obj, offset, startWith) {
          return (startWith || []).concat(Array.prototype.slice.call(obj, offset || 0));
        },
        _pattern = /\{([^\}]+)\}/g;
    var lang = {
      _extraNames: _extraNames,
      _mixin: function(dest, source, copyFunc) {
        var name,
            s,
            i,
            empty = {};
        for (name in source) {
          s = source[name];
          if (!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
            dest[name] = copyFunc ? copyFunc(s) : s;
          }
        }
        if (has("bug-for-in-skips-shadowed")) {
          if (source) {
            for (i = 0; i < _extraLen; ++i) {
              name = _extraNames[i];
              s = source[name];
              if (!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
                dest[name] = copyFunc ? copyFunc(s) : s;
              }
            }
          }
        }
        return dest;
      },
      mixin: function(dest, sources) {
        if (!dest) {
          dest = {};
        }
        for (var i = 1,
            l = arguments.length; i < l; i++) {
          lang._mixin(dest, arguments[i]);
        }
        return dest;
      },
      setObject: function(name, value, context) {
        var parts = name.split("."),
            p = parts.pop(),
            obj = getProp(parts, true, context);
        return obj && p ? (obj[p] = value) : undefined;
      },
      getObject: function(name, create, context) {
        return getProp(name.split("."), create, context);
      },
      exists: function(name, obj) {
        return lang.getObject(name, false, obj) !== undefined;
      },
      isString: function(it) {
        return (typeof it == "string" || it instanceof String);
      },
      isArray: function(it) {
        return it && (it instanceof Array || typeof it == "array");
      },
      isFunction: function(it) {
        return opts.call(it) === "[object Function]";
      },
      isObject: function(it) {
        return it !== undefined && (it === null || typeof it == "object" || lang.isArray(it) || lang.isFunction(it));
      },
      isArrayLike: function(it) {
        return it && it !== undefined && !lang.isString(it) && !lang.isFunction(it) && !(it.tagName && it.tagName.toLowerCase() == 'form') && (lang.isArray(it) || isFinite(it.length));
      },
      isAlien: function(it) {
        return it && !lang.isFunction(it) && /\{\s*\[native code\]\s*\}/.test(String(it));
      },
      extend: function(ctor, props) {
        for (var i = 1,
            l = arguments.length; i < l; i++) {
          lang._mixin(ctor.prototype, arguments[i]);
        }
        return ctor;
      },
      _hitchArgs: function(scope, method) {
        var pre = lang._toArray(arguments, 2);
        var named = lang.isString(method);
        return function() {
          var args = lang._toArray(arguments);
          var f = named ? (scope || dojo.global)[method] : method;
          return f && f.apply(scope || this, pre.concat(args));
        };
      },
      hitch: function(scope, method) {
        if (arguments.length > 2) {
          return lang._hitchArgs.apply(dojo, arguments);
        }
        if (!method) {
          method = scope;
          scope = null;
        }
        if (lang.isString(method)) {
          scope = scope || dojo.global;
          if (!scope[method]) {
            throw (['lang.hitch: scope["', method, '"] is null (scope="', scope, '")'].join(''));
          }
          return function() {
            return scope[method].apply(scope, arguments || []);
          };
        }
        return !scope ? method : function() {
          return method.apply(scope, arguments || []);
        };
      },
      delegate: (function() {
        function TMP() {}
        return function(obj, props) {
          TMP.prototype = obj;
          var tmp = new TMP();
          TMP.prototype = null;
          if (props) {
            lang._mixin(tmp, props);
          }
          return tmp;
        };
      })(),
      _toArray: has("ie") ? (function() {
        function slow(obj, offset, startWith) {
          var arr = startWith || [];
          for (var x = offset || 0; x < obj.length; x++) {
            arr.push(obj[x]);
          }
          return arr;
        }
        return function(obj) {
          return ((obj.item) ? slow : efficient).apply(this, arguments);
        };
      })() : efficient,
      partial: function(method) {
        var arr = [null];
        return lang.hitch.apply(dojo, arr.concat(lang._toArray(arguments)));
      },
      clone: function(src) {
        if (!src || typeof src != "object" || lang.isFunction(src)) {
          return src;
        }
        if (src.nodeType && "cloneNode" in src) {
          return src.cloneNode(true);
        }
        if (src instanceof Date) {
          return new Date(src.getTime());
        }
        if (src instanceof RegExp) {
          return new RegExp(src);
        }
        var r,
            i,
            l;
        if (lang.isArray(src)) {
          r = [];
          for (i = 0, l = src.length; i < l; ++i) {
            if (i in src) {
              r.push(lang.clone(src[i]));
            }
          }
        } else {
          r = src.constructor ? new src.constructor() : {};
        }
        return lang._mixin(r, src, lang.clone);
      },
      trim: String.prototype.trim ? function(str) {
        return str.trim();
      } : function(str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
      },
      replace: function(tmpl, map, pattern) {
        return tmpl.replace(pattern || _pattern, lang.isFunction(map) ? map : function(_, k) {
          return lang.getObject(k, false, map);
        });
      }
    };
    has("extend-dojo") && lang.mixin(dojo, lang);
    return lang;
  });
})(require('process'));
