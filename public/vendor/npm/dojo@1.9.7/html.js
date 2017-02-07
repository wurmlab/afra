/* */ 
"format cjs";
(function(process) {
  define(["./_base/kernel", "./_base/lang", "./_base/array", "./_base/declare", "./dom", "./dom-construct", "./parser"], function(kernel, lang, darray, declare, dom, domConstruct, parser) {
    var idCounter = 0;
    var html = {
      _secureForInnerHtml: function(cont) {
        return cont.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig, "");
      },
      _emptyNode: domConstruct.empty,
      _setNodeContent: function(node, cont) {
        domConstruct.empty(node);
        if (cont) {
          if (typeof cont == "string") {
            cont = domConstruct.toDom(cont, node.ownerDocument);
          }
          if (!cont.nodeType && lang.isArrayLike(cont)) {
            for (var startlen = cont.length,
                i = 0; i < cont.length; i = startlen == cont.length ? i + 1 : 0) {
              domConstruct.place(cont[i], node, "last");
            }
          } else {
            domConstruct.place(cont, node, "last");
          }
        }
        return node;
      },
      _ContentSetter: declare("dojo.html._ContentSetter", null, {
        node: "",
        content: "",
        id: "",
        cleanContent: false,
        extractContent: false,
        parseContent: false,
        parserScope: kernel._scopeName,
        startup: true,
        constructor: function(params, node) {
          lang.mixin(this, params || {});
          node = this.node = dom.byId(this.node || node);
          if (!this.id) {
            this.id = ["Setter", (node) ? node.id || node.tagName : "", idCounter++].join("_");
          }
        },
        set: function(cont, params) {
          if (undefined !== cont) {
            this.content = cont;
          }
          if (params) {
            this._mixin(params);
          }
          this.onBegin();
          this.setContent();
          var ret = this.onEnd();
          if (ret && ret.then) {
            return ret;
          } else {
            return this.node;
          }
        },
        setContent: function() {
          var node = this.node;
          if (!node) {
            throw new Error(this.declaredClass + ": setContent given no node");
          }
          try {
            node = html._setNodeContent(node, this.content);
          } catch (e) {
            var errMess = this.onContentError(e);
            try {
              node.innerHTML = errMess;
            } catch (e) {
              console.error('Fatal ' + this.declaredClass + '.setContent could not change content due to ' + e.message, e);
            }
          }
          this.node = node;
        },
        empty: function() {
          if (this.parseDeferred) {
            if (!this.parseDeferred.isResolved()) {
              this.parseDeferred.cancel();
            }
            delete this.parseDeferred;
          }
          if (this.parseResults && this.parseResults.length) {
            darray.forEach(this.parseResults, function(w) {
              if (w.destroy) {
                w.destroy();
              }
            });
            delete this.parseResults;
          }
          domConstruct.empty(this.node);
        },
        onBegin: function() {
          var cont = this.content;
          if (lang.isString(cont)) {
            if (this.cleanContent) {
              cont = html._secureForInnerHtml(cont);
            }
            if (this.extractContent) {
              var match = cont.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
              if (match) {
                cont = match[1];
              }
            }
          }
          this.empty();
          this.content = cont;
          return this.node;
        },
        onEnd: function() {
          if (this.parseContent) {
            this._parse();
          }
          return this.node;
        },
        tearDown: function() {
          delete this.parseResults;
          delete this.parseDeferred;
          delete this.node;
          delete this.content;
        },
        onContentError: function(err) {
          return "Error occurred setting content: " + err;
        },
        onExecError: function(err) {
          return "Error occurred executing scripts: " + err;
        },
        _mixin: function(params) {
          var empty = {},
              key;
          for (key in params) {
            if (key in empty) {
              continue;
            }
            this[key] = params[key];
          }
        },
        _parse: function() {
          var rootNode = this.node;
          try {
            var inherited = {};
            darray.forEach(["dir", "lang", "textDir"], function(name) {
              if (this[name]) {
                inherited[name] = this[name];
              }
            }, this);
            var self = this;
            this.parseDeferred = parser.parse({
              rootNode: rootNode,
              noStart: !this.startup,
              inherited: inherited,
              scope: this.parserScope
            }).then(function(results) {
              return self.parseResults = results;
            }, function(e) {
              self._onError('Content', e, "Error parsing in _ContentSetter#" + this.id);
            });
          } catch (e) {
            this._onError('Content', e, "Error parsing in _ContentSetter#" + this.id);
          }
        },
        _onError: function(type, err, consoleText) {
          var errText = this['on' + type + 'Error'].call(this, err);
          if (consoleText) {
            console.error(consoleText, err);
          } else if (errText) {
            html._setNodeContent(this.node, errText, true);
          }
        }
      }),
      set: function(node, cont, params) {
        if (undefined == cont) {
          console.warn("dojo.html.set: no cont argument provided, using empty string");
          cont = "";
        }
        if (!params) {
          return html._setNodeContent(node, cont, true);
        } else {
          var op = new html._ContentSetter(lang.mixin(params, {
            content: cont,
            node: node
          }));
          return op.set();
        }
      }
    };
    lang.setObject("dojo.html", html);
    return html;
  });
})(require('process'));
