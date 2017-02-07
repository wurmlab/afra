/* */ 
"format cjs";
(function(process) {
  define(["../_base/array", "../_base/declare", "../_base/kernel", "../_base/lang", "../dom", "../dom-construct", "../mouse", "../_base/NodeList", "../on", "../touch", "./common", "./Container"], function(array, declare, kernel, lang, dom, domConstruct, mouse, NodeList, on, touch, dnd, Container) {
    var Selector = declare("dojo.dnd.Selector", Container, {
      constructor: function(node, params) {
        if (!params) {
          params = {};
        }
        this.singular = params.singular;
        this.autoSync = params.autoSync;
        this.selection = {};
        this.anchor = null;
        this.simpleSelection = false;
        this.events.push(on(this.node, touch.press, lang.hitch(this, "onMouseDown")), on(this.node, touch.release, lang.hitch(this, "onMouseUp")));
      },
      singular: false,
      getSelectedNodes: function() {
        var t = new NodeList();
        var e = dnd._empty;
        for (var i in this.selection) {
          if (i in e) {
            continue;
          }
          t.push(dom.byId(i));
        }
        return t;
      },
      selectNone: function() {
        return this._removeSelection()._removeAnchor();
      },
      selectAll: function() {
        this.forInItems(function(data, id) {
          this._addItemClass(dom.byId(id), "Selected");
          this.selection[id] = 1;
        }, this);
        return this._removeAnchor();
      },
      deleteSelectedNodes: function() {
        var e = dnd._empty;
        for (var i in this.selection) {
          if (i in e) {
            continue;
          }
          var n = dom.byId(i);
          this.delItem(i);
          domConstruct.destroy(n);
        }
        this.anchor = null;
        this.selection = {};
        return this;
      },
      forInSelectedItems: function(f, o) {
        o = o || kernel.global;
        var s = this.selection,
            e = dnd._empty;
        for (var i in s) {
          if (i in e) {
            continue;
          }
          f.call(o, this.getItem(i), i, this);
        }
      },
      sync: function() {
        Selector.superclass.sync.call(this);
        if (this.anchor) {
          if (!this.getItem(this.anchor.id)) {
            this.anchor = null;
          }
        }
        var t = [],
            e = dnd._empty;
        for (var i in this.selection) {
          if (i in e) {
            continue;
          }
          if (!this.getItem(i)) {
            t.push(i);
          }
        }
        array.forEach(t, function(i) {
          delete this.selection[i];
        }, this);
        return this;
      },
      insertNodes: function(addSelected, data, before, anchor) {
        var oldCreator = this._normalizedCreator;
        this._normalizedCreator = function(item, hint) {
          var t = oldCreator.call(this, item, hint);
          if (addSelected) {
            if (!this.anchor) {
              this.anchor = t.node;
              this._removeItemClass(t.node, "Selected");
              this._addItemClass(this.anchor, "Anchor");
            } else if (this.anchor != t.node) {
              this._removeItemClass(t.node, "Anchor");
              this._addItemClass(t.node, "Selected");
            }
            this.selection[t.node.id] = 1;
          } else {
            this._removeItemClass(t.node, "Selected");
            this._removeItemClass(t.node, "Anchor");
          }
          return t;
        };
        Selector.superclass.insertNodes.call(this, data, before, anchor);
        this._normalizedCreator = oldCreator;
        return this;
      },
      destroy: function() {
        Selector.superclass.destroy.call(this);
        this.selection = this.anchor = null;
      },
      onMouseDown: function(e) {
        if (this.autoSync) {
          this.sync();
        }
        if (!this.current) {
          return;
        }
        if (!this.singular && !dnd.getCopyKeyState(e) && !e.shiftKey && (this.current.id in this.selection)) {
          this.simpleSelection = true;
          if (mouse.isLeft(e)) {
            e.stopPropagation();
            e.preventDefault();
          }
          return;
        }
        if (!this.singular && e.shiftKey) {
          if (!dnd.getCopyKeyState(e)) {
            this._removeSelection();
          }
          var c = this.getAllNodes();
          if (c.length) {
            if (!this.anchor) {
              this.anchor = c[0];
              this._addItemClass(this.anchor, "Anchor");
            }
            this.selection[this.anchor.id] = 1;
            if (this.anchor != this.current) {
              var i = 0,
                  node;
              for (; i < c.length; ++i) {
                node = c[i];
                if (node == this.anchor || node == this.current) {
                  break;
                }
              }
              for (++i; i < c.length; ++i) {
                node = c[i];
                if (node == this.anchor || node == this.current) {
                  break;
                }
                this._addItemClass(node, "Selected");
                this.selection[node.id] = 1;
              }
              this._addItemClass(this.current, "Selected");
              this.selection[this.current.id] = 1;
            }
          }
        } else {
          if (this.singular) {
            if (this.anchor == this.current) {
              if (dnd.getCopyKeyState(e)) {
                this.selectNone();
              }
            } else {
              this.selectNone();
              this.anchor = this.current;
              this._addItemClass(this.anchor, "Anchor");
              this.selection[this.current.id] = 1;
            }
          } else {
            if (dnd.getCopyKeyState(e)) {
              if (this.anchor == this.current) {
                delete this.selection[this.anchor.id];
                this._removeAnchor();
              } else {
                if (this.current.id in this.selection) {
                  this._removeItemClass(this.current, "Selected");
                  delete this.selection[this.current.id];
                } else {
                  if (this.anchor) {
                    this._removeItemClass(this.anchor, "Anchor");
                    this._addItemClass(this.anchor, "Selected");
                  }
                  this.anchor = this.current;
                  this._addItemClass(this.current, "Anchor");
                  this.selection[this.current.id] = 1;
                }
              }
            } else {
              if (!(this.current.id in this.selection)) {
                this.selectNone();
                this.anchor = this.current;
                this._addItemClass(this.current, "Anchor");
                this.selection[this.current.id] = 1;
              }
            }
          }
        }
        e.stopPropagation();
        e.preventDefault();
      },
      onMouseUp: function() {
        if (!this.simpleSelection) {
          return;
        }
        this.simpleSelection = false;
        this.selectNone();
        if (this.current) {
          this.anchor = this.current;
          this._addItemClass(this.anchor, "Anchor");
          this.selection[this.current.id] = 1;
        }
      },
      onMouseMove: function() {
        this.simpleSelection = false;
      },
      onOverEvent: function() {
        this.onmousemoveEvent = on(this.node, touch.move, lang.hitch(this, "onMouseMove"));
      },
      onOutEvent: function() {
        if (this.onmousemoveEvent) {
          this.onmousemoveEvent.remove();
          delete this.onmousemoveEvent;
        }
      },
      _removeSelection: function() {
        var e = dnd._empty;
        for (var i in this.selection) {
          if (i in e) {
            continue;
          }
          var node = dom.byId(i);
          if (node) {
            this._removeItemClass(node, "Selected");
          }
        }
        this.selection = {};
        return this;
      },
      _removeAnchor: function() {
        if (this.anchor) {
          this._removeItemClass(this.anchor, "Anchor");
          this.anchor = null;
        }
        return this;
      }
    });
    return Selector;
  });
})(require('process'));
