/* */ 
"format cjs";
(function(process) {
  define(["../_base/array", "../_base/declare", "../_base/kernel", "../_base/lang", "../_base/window", "../dom", "../dom-class", "../dom-construct", "../Evented", "../has", "../on", "../query", "../touch", "./common"], function(array, declare, kernel, lang, win, dom, domClass, domConstruct, Evented, has, on, query, touch, dnd) {
    var Container = declare("dojo.dnd.Container", Evented, {
      skipForm: false,
      allowNested: false,
      constructor: function(node, params) {
        this.node = dom.byId(node);
        if (!params) {
          params = {};
        }
        this.creator = params.creator || null;
        this.skipForm = params.skipForm;
        this.parent = params.dropParent && dom.byId(params.dropParent);
        this.map = {};
        this.current = null;
        this.containerState = "";
        domClass.add(this.node, "dojoDndContainer");
        if (!(params && params._skipStartup)) {
          this.startup();
        }
        this.events = [on(this.node, touch.over, lang.hitch(this, "onMouseOver")), on(this.node, touch.out, lang.hitch(this, "onMouseOut")), on(this.node, "dragstart", lang.hitch(this, "onSelectStart")), on(this.node, "selectstart", lang.hitch(this, "onSelectStart"))];
      },
      creator: function() {},
      getItem: function(key) {
        return this.map[key];
      },
      setItem: function(key, data) {
        this.map[key] = data;
      },
      delItem: function(key) {
        delete this.map[key];
      },
      forInItems: function(f, o) {
        o = o || kernel.global;
        var m = this.map,
            e = dnd._empty;
        for (var i in m) {
          if (i in e) {
            continue;
          }
          f.call(o, m[i], i, this);
        }
        return o;
      },
      clearItems: function() {
        this.map = {};
      },
      getAllNodes: function() {
        return query((this.allowNested ? "" : "> ") + ".dojoDndItem", this.parent);
      },
      sync: function() {
        var map = {};
        this.getAllNodes().forEach(function(node) {
          if (node.id) {
            var item = this.getItem(node.id);
            if (item) {
              map[node.id] = item;
              return;
            }
          } else {
            node.id = dnd.getUniqueId();
          }
          var type = node.getAttribute("dndType"),
              data = node.getAttribute("dndData");
          map[node.id] = {
            data: data || node.innerHTML,
            type: type ? type.split(/\s*,\s*/) : ["text"]
          };
        }, this);
        this.map = map;
        return this;
      },
      insertNodes: function(data, before, anchor) {
        if (!this.parent.firstChild) {
          anchor = null;
        } else if (before) {
          if (!anchor) {
            anchor = this.parent.firstChild;
          }
        } else {
          if (anchor) {
            anchor = anchor.nextSibling;
          }
        }
        var i,
            t;
        if (anchor) {
          for (i = 0; i < data.length; ++i) {
            t = this._normalizedCreator(data[i]);
            this.setItem(t.node.id, {
              data: t.data,
              type: t.type
            });
            anchor.parentNode.insertBefore(t.node, anchor);
          }
        } else {
          for (i = 0; i < data.length; ++i) {
            t = this._normalizedCreator(data[i]);
            this.setItem(t.node.id, {
              data: t.data,
              type: t.type
            });
            this.parent.appendChild(t.node);
          }
        }
        return this;
      },
      destroy: function() {
        array.forEach(this.events, function(handle) {
          handle.remove();
        });
        this.clearItems();
        this.node = this.parent = this.current = null;
      },
      markupFactory: function(params, node, Ctor) {
        params._skipStartup = true;
        return new Ctor(node, params);
      },
      startup: function() {
        if (!this.parent) {
          this.parent = this.node;
          if (this.parent.tagName.toLowerCase() == "table") {
            var c = this.parent.getElementsByTagName("tbody");
            if (c && c.length) {
              this.parent = c[0];
            }
          }
        }
        this.defaultCreator = dnd._defaultCreator(this.parent);
        this.sync();
      },
      onMouseOver: function(e) {
        var n = e.relatedTarget;
        while (n) {
          if (n == this.node) {
            break;
          }
          try {
            n = n.parentNode;
          } catch (x) {
            n = null;
          }
        }
        if (!n) {
          this._changeState("Container", "Over");
          this.onOverEvent();
        }
        n = this._getChildByEvent(e);
        if (this.current == n) {
          return;
        }
        if (this.current) {
          this._removeItemClass(this.current, "Over");
        }
        if (n) {
          this._addItemClass(n, "Over");
        }
        this.current = n;
      },
      onMouseOut: function(e) {
        for (var n = e.relatedTarget; n; ) {
          if (n == this.node) {
            return;
          }
          try {
            n = n.parentNode;
          } catch (x) {
            n = null;
          }
        }
        if (this.current) {
          this._removeItemClass(this.current, "Over");
          this.current = null;
        }
        this._changeState("Container", "");
        this.onOutEvent();
      },
      onSelectStart: function(e) {
        if (!this.skipForm || !dnd.isFormElement(e)) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      onOverEvent: function() {},
      onOutEvent: function() {},
      _changeState: function(type, newState) {
        var prefix = "dojoDnd" + type;
        var state = type.toLowerCase() + "State";
        domClass.replace(this.node, prefix + newState, prefix + this[state]);
        this[state] = newState;
      },
      _addItemClass: function(node, type) {
        domClass.add(node, "dojoDndItem" + type);
      },
      _removeItemClass: function(node, type) {
        domClass.remove(node, "dojoDndItem" + type);
      },
      _getChildByEvent: function(e) {
        var node = e.target;
        if (node) {
          for (var parent = node.parentNode; parent; node = parent, parent = node.parentNode) {
            if ((parent == this.parent || this.allowNested) && domClass.contains(node, "dojoDndItem")) {
              return node;
            }
          }
        }
        return null;
      },
      _normalizedCreator: function(item, hint) {
        var t = (this.creator || this.defaultCreator).call(this, item, hint);
        if (!lang.isArray(t.type)) {
          t.type = ["text"];
        }
        if (!t.node.id) {
          t.node.id = dnd.getUniqueId();
        }
        domClass.add(t.node, "dojoDndItem");
        return t;
      }
    });
    dnd._createNode = function(tag) {
      if (!tag) {
        return dnd._createSpan;
      }
      return function(text) {
        return domConstruct.create(tag, {innerHTML: text});
      };
    };
    dnd._createTrTd = function(text) {
      var tr = domConstruct.create("tr");
      domConstruct.create("td", {innerHTML: text}, tr);
      return tr;
    };
    dnd._createSpan = function(text) {
      return domConstruct.create("span", {innerHTML: text});
    };
    dnd._defaultCreatorNodes = {
      ul: "li",
      ol: "li",
      div: "div",
      p: "div"
    };
    dnd._defaultCreator = function(node) {
      var tag = node.tagName.toLowerCase();
      var c = tag == "tbody" || tag == "thead" ? dnd._createTrTd : dnd._createNode(dnd._defaultCreatorNodes[tag]);
      return function(item, hint) {
        var isObj = item && lang.isObject(item),
            data,
            type,
            n;
        if (isObj && item.tagName && item.nodeType && item.getAttribute) {
          data = item.getAttribute("dndData") || item.innerHTML;
          type = item.getAttribute("dndType");
          type = type ? type.split(/\s*,\s*/) : ["text"];
          n = item;
        } else {
          data = (isObj && item.data) ? item.data : item;
          type = (isObj && item.type) ? item.type : ["text"];
          n = (hint == "avatar" ? dnd._createSpan : c)(String(data));
        }
        if (!n.id) {
          n.id = dnd.getUniqueId();
        }
        return {
          node: n,
          data: data,
          type: type
        };
      };
    };
    return Container;
  });
})(require('process'));
