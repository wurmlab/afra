/* */ 
"format cjs";
(function(process) {
  define(["require", "./_base/kernel", "./_base/lang", "./_base/array", "./_base/config", "./dom", "./_base/window", "./_base/url", "./aspect", "./promise/all", "./date/stamp", "./Deferred", "./has", "./query", "./on", "./ready"], function(require, dojo, dlang, darray, config, dom, dwindow, _Url, aspect, all, dates, Deferred, has, query, don, ready) {
    new Date("X");
    function myEval(text) {
      return eval("(" + text + ")");
    }
    var extendCnt = 0;
    aspect.after(dlang, "extend", function() {
      extendCnt++;
    }, true);
    function getNameMap(ctor) {
      var map = ctor._nameCaseMap,
          proto = ctor.prototype;
      if (!map || map._extendCnt < extendCnt) {
        map = ctor._nameCaseMap = {};
        for (var name in proto) {
          if (name.charAt(0) === "_") {
            continue;
          }
          map[name.toLowerCase()] = name;
        }
        map._extendCnt = extendCnt;
      }
      return map;
    }
    var _ctorMap = {};
    function getCtor(types, contextRequire) {
      var ts = types.join();
      if (!_ctorMap[ts]) {
        var mixins = [];
        for (var i = 0,
            l = types.length; i < l; i++) {
          var t = types[i];
          mixins[mixins.length] = (_ctorMap[t] = _ctorMap[t] || (dlang.getObject(t) || (~t.indexOf('/') && (contextRequire ? contextRequire(t) : require(t)))));
        }
        var ctor = mixins.shift();
        _ctorMap[ts] = mixins.length ? (ctor.createSubclass ? ctor.createSubclass(mixins) : ctor.extend.apply(ctor, mixins)) : ctor;
      }
      return _ctorMap[ts];
    }
    var parser = {
      _clearCache: function() {
        extendCnt++;
        _ctorMap = {};
      },
      _functionFromScript: function(script, attrData) {
        var preamble = "",
            suffix = "",
            argsStr = (script.getAttribute(attrData + "args") || script.getAttribute("args")),
            withStr = script.getAttribute("with");
        var fnArgs = (argsStr || "").split(/\s*,\s*/);
        if (withStr && withStr.length) {
          darray.forEach(withStr.split(/\s*,\s*/), function(part) {
            preamble += "with(" + part + "){";
            suffix += "}";
          });
        }
        return new Function(fnArgs, preamble + script.innerHTML + suffix);
      },
      instantiate: function(nodes, mixin, options) {
        mixin = mixin || {};
        options = options || {};
        var dojoType = (options.scope || dojo._scopeName) + "Type",
            attrData = "data-" + (options.scope || dojo._scopeName) + "-",
            dataDojoType = attrData + "type",
            dataDojoMixins = attrData + "mixins";
        var list = [];
        darray.forEach(nodes, function(node) {
          var type = dojoType in mixin ? mixin[dojoType] : node.getAttribute(dataDojoType) || node.getAttribute(dojoType);
          if (type) {
            var mixinsValue = node.getAttribute(dataDojoMixins),
                types = mixinsValue ? [type].concat(mixinsValue.split(/\s*,\s*/)) : [type];
            list.push({
              node: node,
              types: types
            });
          }
        });
        return this._instantiate(list, mixin, options);
      },
      _instantiate: function(nodes, mixin, options, returnPromise) {
        var thelist = darray.map(nodes, function(obj) {
          var ctor = obj.ctor || getCtor(obj.types, options.contextRequire);
          if (!ctor) {
            throw new Error("Unable to resolve constructor for: '" + obj.types.join() + "'");
          }
          return this.construct(ctor, obj.node, mixin, options, obj.scripts, obj.inherited);
        }, this);
        function onConstruct(thelist) {
          if (!mixin._started && !options.noStart) {
            darray.forEach(thelist, function(instance) {
              if (typeof instance.startup === "function" && !instance._started) {
                instance.startup();
              }
            });
          }
          return thelist;
        }
        if (returnPromise) {
          return all(thelist).then(onConstruct);
        } else {
          return onConstruct(thelist);
        }
      },
      construct: function(ctor, node, mixin, options, scripts, inherited) {
        var proto = ctor && ctor.prototype;
        options = options || {};
        var params = {};
        if (options.defaults) {
          dlang.mixin(params, options.defaults);
        }
        if (inherited) {
          dlang.mixin(params, inherited);
        }
        var attributes;
        if (has("dom-attributes-explicit")) {
          attributes = node.attributes;
        } else if (has("dom-attributes-specified-flag")) {
          attributes = darray.filter(node.attributes, function(a) {
            return a.specified;
          });
        } else {
          var clone = /^input$|^img$/i.test(node.nodeName) ? node : node.cloneNode(false),
              attrs = clone.outerHTML.replace(/=[^\s"']+|="[^"]*"|='[^']*'/g, "").replace(/^\s*<[a-zA-Z0-9]*\s*/, "").replace(/\s*>.*$/, "");
          attributes = darray.map(attrs.split(/\s+/), function(name) {
            var lcName = name.toLowerCase();
            return {
              name: name,
              value: (node.nodeName == "LI" && name == "value") || lcName == "enctype" ? node.getAttribute(lcName) : node.getAttributeNode(lcName).value
            };
          });
        }
        var scope = options.scope || dojo._scopeName,
            attrData = "data-" + scope + "-",
            hash = {};
        if (scope !== "dojo") {
          hash[attrData + "props"] = "data-dojo-props";
          hash[attrData + "type"] = "data-dojo-type";
          hash[attrData + "mixins"] = "data-dojo-mixins";
          hash[scope + "type"] = "dojoType";
          hash[attrData + "id"] = "data-dojo-id";
        }
        var i = 0,
            item,
            funcAttrs = [],
            jsname,
            extra;
        while (item = attributes[i++]) {
          var name = item.name,
              lcName = name.toLowerCase(),
              value = item.value;
          switch (hash[lcName] || lcName) {
            case "data-dojo-type":
            case "dojotype":
            case "data-dojo-mixins":
              break;
            case "data-dojo-props":
              extra = value;
              break;
            case "data-dojo-id":
            case "jsid":
              jsname = value;
              break;
            case "data-dojo-attach-point":
            case "dojoattachpoint":
              params.dojoAttachPoint = value;
              break;
            case "data-dojo-attach-event":
            case "dojoattachevent":
              params.dojoAttachEvent = value;
              break;
            case "class":
              params["class"] = node.className;
              break;
            case "style":
              params["style"] = node.style && node.style.cssText;
              break;
            default:
              if (!(name in proto)) {
                var map = getNameMap(ctor);
                name = map[lcName] || name;
              }
              if (name in proto) {
                switch (typeof proto[name]) {
                  case "string":
                    params[name] = value;
                    break;
                  case "number":
                    params[name] = value.length ? Number(value) : NaN;
                    break;
                  case "boolean":
                    params[name] = value.toLowerCase() != "false";
                    break;
                  case "function":
                    if (value === "" || value.search(/[^\w\.]+/i) != -1) {
                      params[name] = new Function(value);
                    } else {
                      params[name] = dlang.getObject(value, false) || new Function(value);
                    }
                    funcAttrs.push(name);
                    break;
                  default:
                    var pVal = proto[name];
                    params[name] = (pVal && "length" in pVal) ? (value ? value.split(/\s*,\s*/) : []) : (pVal instanceof Date) ? (value == "" ? new Date("") : value == "now" ? new Date() : dates.fromISOString(value)) : (pVal instanceof _Url) ? (dojo.baseUrl + value) : myEval(value);
                }
              } else {
                params[name] = value;
              }
          }
        }
        for (var j = 0; j < funcAttrs.length; j++) {
          var lcfname = funcAttrs[j].toLowerCase();
          node.removeAttribute(lcfname);
          node[lcfname] = null;
        }
        if (extra) {
          try {
            extra = myEval.call(options.propsThis, "{" + extra + "}");
            dlang.mixin(params, extra);
          } catch (e) {
            throw new Error(e.toString() + " in data-dojo-props='" + extra + "'");
          }
        }
        dlang.mixin(params, mixin);
        if (!scripts) {
          scripts = (ctor && (ctor._noScript || proto._noScript) ? [] : query("> script[type^='dojo/']", node));
        }
        var aspects = [],
            calls = [],
            watches = [],
            ons = [];
        if (scripts) {
          for (i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            node.removeChild(script);
            var event = (script.getAttribute(attrData + "event") || script.getAttribute("event")),
                prop = script.getAttribute(attrData + "prop"),
                method = script.getAttribute(attrData + "method"),
                advice = script.getAttribute(attrData + "advice"),
                scriptType = script.getAttribute("type"),
                nf = this._functionFromScript(script, attrData);
            if (event) {
              if (scriptType == "dojo/connect") {
                aspects.push({
                  method: event,
                  func: nf
                });
              } else if (scriptType == "dojo/on") {
                ons.push({
                  event: event,
                  func: nf
                });
              } else {
                params[event] = nf;
              }
            } else if (scriptType == "dojo/aspect") {
              aspects.push({
                method: method,
                advice: advice,
                func: nf
              });
            } else if (scriptType == "dojo/watch") {
              watches.push({
                prop: prop,
                func: nf
              });
            } else {
              calls.push(nf);
            }
          }
        }
        var markupFactory = ctor.markupFactory || proto.markupFactory;
        var instance = markupFactory ? markupFactory(params, node, ctor) : new ctor(params, node);
        function onInstantiate(instance) {
          if (jsname) {
            dlang.setObject(jsname, instance);
          }
          for (i = 0; i < aspects.length; i++) {
            aspect[aspects[i].advice || "after"](instance, aspects[i].method, dlang.hitch(instance, aspects[i].func), true);
          }
          for (i = 0; i < calls.length; i++) {
            calls[i].call(instance);
          }
          for (i = 0; i < watches.length; i++) {
            instance.watch(watches[i].prop, watches[i].func);
          }
          for (i = 0; i < ons.length; i++) {
            don(instance, ons[i].event, ons[i].func);
          }
          return instance;
        }
        if (instance.then) {
          return instance.then(onInstantiate);
        } else {
          return onInstantiate(instance);
        }
      },
      scan: function(root, options) {
        var list = [],
            mids = [],
            midsHash = {};
        var dojoType = (options.scope || dojo._scopeName) + "Type",
            attrData = "data-" + (options.scope || dojo._scopeName) + "-",
            dataDojoType = attrData + "type",
            dataDojoTextDir = attrData + "textdir",
            dataDojoMixins = attrData + "mixins";
        var node = root.firstChild;
        var inherited = options.inherited;
        if (!inherited) {
          function findAncestorAttr(node, attr) {
            return (node.getAttribute && node.getAttribute(attr)) || (node.parentNode && findAncestorAttr(node.parentNode, attr));
          }
          inherited = {
            dir: findAncestorAttr(root, "dir"),
            lang: findAncestorAttr(root, "lang"),
            textDir: findAncestorAttr(root, dataDojoTextDir)
          };
          for (var key in inherited) {
            if (!inherited[key]) {
              delete inherited[key];
            }
          }
        }
        var parent = {inherited: inherited};
        var scripts;
        var scriptsOnly;
        function getEffective(parent) {
          if (!parent.inherited) {
            parent.inherited = {};
            var node = parent.node,
                grandparent = getEffective(parent.parent);
            var inherited = {
              dir: node.getAttribute("dir") || grandparent.dir,
              lang: node.getAttribute("lang") || grandparent.lang,
              textDir: node.getAttribute(dataDojoTextDir) || grandparent.textDir
            };
            for (var key in inherited) {
              if (inherited[key]) {
                parent.inherited[key] = inherited[key];
              }
            }
          }
          return parent.inherited;
        }
        while (true) {
          if (!node) {
            if (!parent || !parent.node) {
              break;
            }
            node = parent.node.nextSibling;
            scriptsOnly = false;
            parent = parent.parent;
            scripts = parent.scripts;
            continue;
          }
          if (node.nodeType != 1) {
            node = node.nextSibling;
            continue;
          }
          if (scripts && node.nodeName.toLowerCase() == "script") {
            type = node.getAttribute("type");
            if (type && /^dojo\/\w/i.test(type)) {
              scripts.push(node);
            }
            node = node.nextSibling;
            continue;
          }
          if (scriptsOnly) {
            node = node.nextSibling;
            continue;
          }
          var type = node.getAttribute(dataDojoType) || node.getAttribute(dojoType);
          var firstChild = node.firstChild;
          if (!type && (!firstChild || (firstChild.nodeType == 3 && !firstChild.nextSibling))) {
            node = node.nextSibling;
            continue;
          }
          var current;
          var ctor = null;
          if (type) {
            var mixinsValue = node.getAttribute(dataDojoMixins),
                types = mixinsValue ? [type].concat(mixinsValue.split(/\s*,\s*/)) : [type];
            try {
              ctor = getCtor(types, options.contextRequire);
            } catch (e) {}
            if (!ctor) {
              darray.forEach(types, function(t) {
                if (~t.indexOf('/') && !midsHash[t]) {
                  midsHash[t] = true;
                  mids[mids.length] = t;
                }
              });
            }
            var childScripts = ctor && !ctor.prototype._noScript ? [] : null;
            current = {
              types: types,
              ctor: ctor,
              parent: parent,
              node: node,
              scripts: childScripts
            };
            current.inherited = getEffective(current);
            list.push(current);
          } else {
            current = {
              node: node,
              scripts: scripts,
              parent: parent
            };
          }
          scripts = childScripts;
          scriptsOnly = node.stopParser || (ctor && ctor.prototype.stopParser && !(options.template));
          parent = current;
          node = firstChild;
        }
        var d = new Deferred();
        if (mids.length) {
          if (has("dojo-debug-messages")) {
            console.warn("WARNING: Modules being Auto-Required: " + mids.join(", "));
          }
          var r = options.contextRequire || require;
          r(mids, function() {
            d.resolve(darray.filter(list, function(widget) {
              if (!widget.ctor) {
                try {
                  widget.ctor = getCtor(widget.types, options.contextRequire);
                } catch (e) {}
              }
              var parent = widget.parent;
              while (parent && !parent.types) {
                parent = parent.parent;
              }
              var proto = widget.ctor && widget.ctor.prototype;
              widget.instantiateChildren = !(proto && proto.stopParser && !(options.template));
              widget.instantiate = !parent || (parent.instantiate && parent.instantiateChildren);
              return widget.instantiate;
            }));
          });
        } else {
          d.resolve(list);
        }
        return d.promise;
      },
      _require: function(script, options) {
        var hash = myEval("{" + script.innerHTML + "}"),
            vars = [],
            mids = [],
            d = new Deferred();
        var contextRequire = (options && options.contextRequire) || require;
        for (var name in hash) {
          vars.push(name);
          mids.push(hash[name]);
        }
        contextRequire(mids, function() {
          for (var i = 0; i < vars.length; i++) {
            dlang.setObject(vars[i], arguments[i]);
          }
          d.resolve(arguments);
        });
        return d.promise;
      },
      _scanAmd: function(root, options) {
        var deferred = new Deferred(),
            promise = deferred.promise;
        deferred.resolve(true);
        var self = this;
        query("script[type='dojo/require']", root).forEach(function(node) {
          promise = promise.then(function() {
            return self._require(node, options);
          });
          node.parentNode.removeChild(node);
        });
        return promise;
      },
      parse: function(rootNode, options) {
        var root;
        if (!options && rootNode && rootNode.rootNode) {
          options = rootNode;
          root = options.rootNode;
        } else if (rootNode && dlang.isObject(rootNode) && !("nodeType" in rootNode)) {
          options = rootNode;
        } else {
          root = rootNode;
        }
        root = root ? dom.byId(root) : dwindow.body();
        options = options || {};
        var mixin = options.template ? {template: true} : {},
            instances = [],
            self = this;
        var p = this._scanAmd(root, options).then(function() {
          return self.scan(root, options);
        }).then(function(parsedNodes) {
          return self._instantiate(parsedNodes, mixin, options, true);
        }).then(function(_instances) {
          return instances = instances.concat(_instances);
        }).otherwise(function(e) {
          console.error("dojo/parser::parse() error", e);
          throw e;
        });
        dlang.mixin(instances, p);
        return instances;
      }
    };
    if (has("extend-dojo")) {
      dojo.parser = parser;
    }
    if (config.parseOnLoad) {
      ready(100, parser, "parse");
    }
    return parser;
  });
})(require('process'));
