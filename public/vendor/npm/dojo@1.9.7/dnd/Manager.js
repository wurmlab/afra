/* */ 
"format cjs";
(function(process) {
  define(["../_base/array", "../_base/declare", "../_base/lang", "../_base/window", "../dom-class", "../Evented", "../has", "../keys", "../on", "../topic", "../touch", "./common", "./autoscroll", "./Avatar"], function(array, declare, lang, win, domClass, Evented, has, keys, on, topic, touch, dnd, autoscroll, Avatar) {
    var Manager = declare("dojo.dnd.Manager", [Evented], {
      constructor: function() {
        this.avatar = null;
        this.source = null;
        this.nodes = [];
        this.copy = true;
        this.target = null;
        this.canDropFlag = false;
        this.events = [];
      },
      OFFSET_X: has("touch") ? 0 : 16,
      OFFSET_Y: has("touch") ? -64 : 16,
      overSource: function(source) {
        if (this.avatar) {
          this.target = (source && source.targetState != "Disabled") ? source : null;
          this.canDropFlag = Boolean(this.target);
          this.avatar.update();
        }
        topic.publish("/dnd/source/over", source);
      },
      outSource: function(source) {
        if (this.avatar) {
          if (this.target == source) {
            this.target = null;
            this.canDropFlag = false;
            this.avatar.update();
            topic.publish("/dnd/source/over", null);
          }
        } else {
          topic.publish("/dnd/source/over", null);
        }
      },
      startDrag: function(source, nodes, copy) {
        autoscroll.autoScrollStart(win.doc);
        this.source = source;
        this.nodes = nodes;
        this.copy = Boolean(copy);
        this.avatar = this.makeAvatar();
        win.body().appendChild(this.avatar.node);
        topic.publish("/dnd/start", source, nodes, this.copy);
        function stopEvent(e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.events = [on(win.doc, touch.move, lang.hitch(this, "onMouseMove")), on(win.doc, touch.release, lang.hitch(this, "onMouseUp")), on(win.doc, "keydown", lang.hitch(this, "onKeyDown")), on(win.doc, "keyup", lang.hitch(this, "onKeyUp")), on(win.doc, "dragstart", stopEvent), on(win.body(), "selectstart", stopEvent)];
        var c = "dojoDnd" + (copy ? "Copy" : "Move");
        domClass.add(win.body(), c);
      },
      canDrop: function(flag) {
        var canDropFlag = Boolean(this.target && flag);
        if (this.canDropFlag != canDropFlag) {
          this.canDropFlag = canDropFlag;
          this.avatar.update();
        }
      },
      stopDrag: function() {
        domClass.remove(win.body(), ["dojoDndCopy", "dojoDndMove"]);
        array.forEach(this.events, function(handle) {
          handle.remove();
        });
        this.events = [];
        this.avatar.destroy();
        this.avatar = null;
        this.source = this.target = null;
        this.nodes = [];
      },
      makeAvatar: function() {
        return new Avatar(this);
      },
      updateAvatar: function() {
        this.avatar.update();
      },
      onMouseMove: function(e) {
        var a = this.avatar;
        if (a) {
          autoscroll.autoScrollNodes(e);
          var s = a.node.style;
          s.left = (e.pageX + this.OFFSET_X) + "px";
          s.top = (e.pageY + this.OFFSET_Y) + "px";
          var copy = Boolean(this.source.copyState(dnd.getCopyKeyState(e)));
          if (this.copy != copy) {
            this._setCopyStatus(copy);
          }
        }
        if (has("touch")) {
          e.preventDefault();
        }
      },
      onMouseUp: function(e) {
        if (this.avatar) {
          if (this.target && this.canDropFlag) {
            var copy = Boolean(this.source.copyState(dnd.getCopyKeyState(e)));
            topic.publish("/dnd/drop/before", this.source, this.nodes, copy, this.target, e);
            topic.publish("/dnd/drop", this.source, this.nodes, copy, this.target, e);
          } else {
            topic.publish("/dnd/cancel");
          }
          this.stopDrag();
        }
      },
      onKeyDown: function(e) {
        if (this.avatar) {
          switch (e.keyCode) {
            case keys.CTRL:
              var copy = Boolean(this.source.copyState(true));
              if (this.copy != copy) {
                this._setCopyStatus(copy);
              }
              break;
            case keys.ESCAPE:
              topic.publish("/dnd/cancel");
              this.stopDrag();
              break;
          }
        }
      },
      onKeyUp: function(e) {
        if (this.avatar && e.keyCode == keys.CTRL) {
          var copy = Boolean(this.source.copyState(false));
          if (this.copy != copy) {
            this._setCopyStatus(copy);
          }
        }
      },
      _setCopyStatus: function(copy) {
        this.copy = copy;
        this.source._markDndStatus(this.copy);
        this.updateAvatar();
        domClass.replace(win.body(), "dojoDnd" + (this.copy ? "Copy" : "Move"), "dojoDnd" + (this.copy ? "Move" : "Copy"));
      }
    });
    dnd._manager = null;
    Manager.manager = dnd.manager = function() {
      if (!dnd._manager) {
        dnd._manager = new Manager();
      }
      return dnd._manager;
    };
    return Manager;
  });
})(require('process'));
