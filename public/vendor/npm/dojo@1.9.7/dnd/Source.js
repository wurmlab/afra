/* */ 
"format cjs";
(function(process) {
  define(["../_base/array", "../_base/declare", "../_base/kernel", "../_base/lang", "../dom-class", "../dom-geometry", "../mouse", "../ready", "../topic", "./common", "./Selector", "./Manager"], function(array, declare, kernel, lang, domClass, domGeom, mouse, ready, topic, dnd, Selector, Manager) {
    if (!kernel.isAsync) {
      ready(0, function() {
        var requires = ["dojo/dnd/AutoSource", "dojo/dnd/Target"];
        require(requires);
      });
    }
    var Source = declare("dojo.dnd.Source", Selector, {
      isSource: true,
      horizontal: false,
      copyOnly: false,
      selfCopy: false,
      selfAccept: true,
      skipForm: false,
      withHandles: false,
      autoSync: false,
      delay: 0,
      accept: ["text"],
      generateText: true,
      constructor: function(node, params) {
        lang.mixin(this, lang.mixin({}, params));
        var type = this.accept;
        if (type.length) {
          this.accept = {};
          for (var i = 0; i < type.length; ++i) {
            this.accept[type[i]] = 1;
          }
        }
        this.isDragging = false;
        this.mouseDown = false;
        this.targetAnchor = null;
        this.targetBox = null;
        this.before = true;
        this._lastX = 0;
        this._lastY = 0;
        this.sourceState = "";
        if (this.isSource) {
          domClass.add(this.node, "dojoDndSource");
        }
        this.targetState = "";
        if (this.accept) {
          domClass.add(this.node, "dojoDndTarget");
        }
        if (this.horizontal) {
          domClass.add(this.node, "dojoDndHorizontal");
        }
        this.topics = [topic.subscribe("/dnd/source/over", lang.hitch(this, "onDndSourceOver")), topic.subscribe("/dnd/start", lang.hitch(this, "onDndStart")), topic.subscribe("/dnd/drop", lang.hitch(this, "onDndDrop")), topic.subscribe("/dnd/cancel", lang.hitch(this, "onDndCancel"))];
      },
      checkAcceptance: function(source, nodes) {
        if (this == source) {
          return !this.copyOnly || this.selfAccept;
        }
        for (var i = 0; i < nodes.length; ++i) {
          var type = source.getItem(nodes[i].id).type;
          var flag = false;
          for (var j = 0; j < type.length; ++j) {
            if (type[j] in this.accept) {
              flag = true;
              break;
            }
          }
          if (!flag) {
            return false;
          }
        }
        return true;
      },
      copyState: function(keyPressed, self) {
        if (keyPressed) {
          return true;
        }
        if (arguments.length < 2) {
          self = this == Manager.manager().target;
        }
        if (self) {
          if (this.copyOnly) {
            return this.selfCopy;
          }
        } else {
          return this.copyOnly;
        }
        return false;
      },
      destroy: function() {
        Source.superclass.destroy.call(this);
        array.forEach(this.topics, function(t) {
          t.remove();
        });
        this.targetAnchor = null;
      },
      onMouseMove: function(e) {
        if (this.isDragging && this.targetState == "Disabled") {
          return;
        }
        Source.superclass.onMouseMove.call(this, e);
        var m = Manager.manager();
        if (!this.isDragging) {
          if (this.mouseDown && this.isSource && (Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay)) {
            var nodes = this.getSelectedNodes();
            if (nodes.length) {
              m.startDrag(this, nodes, this.copyState(dnd.getCopyKeyState(e), true));
            }
          }
        }
        if (this.isDragging) {
          var before = false;
          if (this.current) {
            if (!this.targetBox || this.targetAnchor != this.current) {
              this.targetBox = domGeom.position(this.current, true);
            }
            if (this.horizontal) {
              before = (e.pageX - this.targetBox.x < this.targetBox.w / 2) == domGeom.isBodyLtr(this.current.ownerDocument);
            } else {
              before = (e.pageY - this.targetBox.y) < (this.targetBox.h / 2);
            }
          }
          if (this.current != this.targetAnchor || before != this.before) {
            this._markTargetAnchor(before);
            m.canDrop(!this.current || m.source != this || !(this.current.id in this.selection));
          }
        }
      },
      onMouseDown: function(e) {
        if (!this.mouseDown && this._legalMouseDown(e) && (!this.skipForm || !dnd.isFormElement(e))) {
          this.mouseDown = true;
          this._lastX = e.pageX;
          this._lastY = e.pageY;
          Source.superclass.onMouseDown.call(this, e);
        }
      },
      onMouseUp: function(e) {
        if (this.mouseDown) {
          this.mouseDown = false;
          Source.superclass.onMouseUp.call(this, e);
        }
      },
      onDndSourceOver: function(source) {
        if (this !== source) {
          this.mouseDown = false;
          if (this.targetAnchor) {
            this._unmarkTargetAnchor();
          }
        } else if (this.isDragging) {
          var m = Manager.manager();
          m.canDrop(this.targetState != "Disabled" && (!this.current || m.source != this || !(this.current.id in this.selection)));
        }
      },
      onDndStart: function(source, nodes, copy) {
        if (this.autoSync) {
          this.sync();
        }
        if (this.isSource) {
          this._changeState("Source", this == source ? (copy ? "Copied" : "Moved") : "");
        }
        var accepted = this.accept && this.checkAcceptance(source, nodes);
        this._changeState("Target", accepted ? "" : "Disabled");
        if (this == source) {
          Manager.manager().overSource(this);
        }
        this.isDragging = true;
      },
      onDndDrop: function(source, nodes, copy, target) {
        if (this == target) {
          this.onDrop(source, nodes, copy);
        }
        this.onDndCancel();
      },
      onDndCancel: function() {
        if (this.targetAnchor) {
          this._unmarkTargetAnchor();
          this.targetAnchor = null;
        }
        this.before = true;
        this.isDragging = false;
        this.mouseDown = false;
        this._changeState("Source", "");
        this._changeState("Target", "");
      },
      onDrop: function(source, nodes, copy) {
        if (this != source) {
          this.onDropExternal(source, nodes, copy);
        } else {
          this.onDropInternal(nodes, copy);
        }
      },
      onDropExternal: function(source, nodes, copy) {
        var oldCreator = this._normalizedCreator;
        if (this.creator) {
          this._normalizedCreator = function(node, hint) {
            return oldCreator.call(this, source.getItem(node.id).data, hint);
          };
        } else {
          if (copy) {
            this._normalizedCreator = function(node) {
              var t = source.getItem(node.id);
              var n = node.cloneNode(true);
              n.id = dnd.getUniqueId();
              return {
                node: n,
                data: t.data,
                type: t.type
              };
            };
          } else {
            this._normalizedCreator = function(node) {
              var t = source.getItem(node.id);
              source.delItem(node.id);
              return {
                node: node,
                data: t.data,
                type: t.type
              };
            };
          }
        }
        this.selectNone();
        if (!copy && !this.creator) {
          source.selectNone();
        }
        this.insertNodes(true, nodes, this.before, this.current);
        if (!copy && this.creator) {
          source.deleteSelectedNodes();
        }
        this._normalizedCreator = oldCreator;
      },
      onDropInternal: function(nodes, copy) {
        var oldCreator = this._normalizedCreator;
        if (this.current && this.current.id in this.selection) {
          return;
        }
        if (copy) {
          if (this.creator) {
            this._normalizedCreator = function(node, hint) {
              return oldCreator.call(this, this.getItem(node.id).data, hint);
            };
          } else {
            this._normalizedCreator = function(node) {
              var t = this.getItem(node.id);
              var n = node.cloneNode(true);
              n.id = dnd.getUniqueId();
              return {
                node: n,
                data: t.data,
                type: t.type
              };
            };
          }
        } else {
          if (!this.current) {
            return;
          }
          this._normalizedCreator = function(node) {
            var t = this.getItem(node.id);
            return {
              node: node,
              data: t.data,
              type: t.type
            };
          };
        }
        this._removeSelection();
        this.insertNodes(true, nodes, this.before, this.current);
        this._normalizedCreator = oldCreator;
      },
      onDraggingOver: function() {},
      onDraggingOut: function() {},
      onOverEvent: function() {
        Source.superclass.onOverEvent.call(this);
        Manager.manager().overSource(this);
        if (this.isDragging && this.targetState != "Disabled") {
          this.onDraggingOver();
        }
      },
      onOutEvent: function() {
        Source.superclass.onOutEvent.call(this);
        Manager.manager().outSource(this);
        if (this.isDragging && this.targetState != "Disabled") {
          this.onDraggingOut();
        }
      },
      _markTargetAnchor: function(before) {
        if (this.current == this.targetAnchor && this.before == before) {
          return;
        }
        if (this.targetAnchor) {
          this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
        }
        this.targetAnchor = this.current;
        this.targetBox = null;
        this.before = before;
        if (this.targetAnchor) {
          this._addItemClass(this.targetAnchor, this.before ? "Before" : "After");
        }
      },
      _unmarkTargetAnchor: function() {
        if (!this.targetAnchor) {
          return;
        }
        this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
        this.targetAnchor = null;
        this.targetBox = null;
        this.before = true;
      },
      _markDndStatus: function(copy) {
        this._changeState("Source", copy ? "Copied" : "Moved");
      },
      _legalMouseDown: function(e) {
        if (e.type != "touchstart" && !mouse.isLeft(e)) {
          return false;
        }
        if (!this.withHandles) {
          return true;
        }
        for (var node = e.target; node && node !== this.node; node = node.parentNode) {
          if (domClass.contains(node, "dojoDndHandle")) {
            return true;
          }
          if (domClass.contains(node, "dojoDndItem") || domClass.contains(node, "dojoDndIgnore")) {
            break;
          }
        }
        return false;
      }
    });
    return Source;
  });
})(require('process'));
