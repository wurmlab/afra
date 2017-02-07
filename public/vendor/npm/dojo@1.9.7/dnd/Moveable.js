/* */ 
"format cjs";
(function(process) {
  define(["../_base/array", "../_base/declare", "../_base/lang", "../dom", "../dom-class", "../Evented", "../on", "../topic", "../touch", "./common", "./Mover", "../_base/window"], function(array, declare, lang, dom, domClass, Evented, on, topic, touch, dnd, Mover, win) {
    var Moveable = declare("dojo.dnd.Moveable", [Evented], {
      handle: "",
      delay: 0,
      skip: false,
      constructor: function(node, params) {
        this.node = dom.byId(node);
        if (!params) {
          params = {};
        }
        this.handle = params.handle ? dom.byId(params.handle) : null;
        if (!this.handle) {
          this.handle = this.node;
        }
        this.delay = params.delay > 0 ? params.delay : 0;
        this.skip = params.skip;
        this.mover = params.mover ? params.mover : Mover;
        this.events = [on(this.handle, touch.press, lang.hitch(this, "onMouseDown")), on(this.handle, "dragstart", lang.hitch(this, "onSelectStart")), on(this.handle, "selectstart", lang.hitch(this, "onSelectStart"))];
      },
      markupFactory: function(params, node, Ctor) {
        return new Ctor(node, params);
      },
      destroy: function() {
        array.forEach(this.events, function(handle) {
          handle.remove();
        });
        this.events = this.node = this.handle = null;
      },
      onMouseDown: function(e) {
        if (this.skip && dnd.isFormElement(e)) {
          return;
        }
        if (this.delay) {
          this.events.push(on(this.handle, touch.move, lang.hitch(this, "onMouseMove")), on(this.handle, touch.release, lang.hitch(this, "onMouseUp")));
          this._lastX = e.pageX;
          this._lastY = e.pageY;
        } else {
          this.onDragDetected(e);
        }
        e.stopPropagation();
        e.preventDefault();
      },
      onMouseMove: function(e) {
        if (Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay) {
          this.onMouseUp(e);
          this.onDragDetected(e);
        }
        e.stopPropagation();
        e.preventDefault();
      },
      onMouseUp: function(e) {
        for (var i = 0; i < 2; ++i) {
          this.events.pop().remove();
        }
        e.stopPropagation();
        e.preventDefault();
      },
      onSelectStart: function(e) {
        if (!this.skip || !dnd.isFormElement(e)) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      onDragDetected: function(e) {
        new this.mover(this.node, e, this);
      },
      onMoveStart: function(mover) {
        topic.publish("/dnd/move/start", mover);
        domClass.add(win.body(), "dojoMove");
        domClass.add(this.node, "dojoMoveItem");
      },
      onMoveStop: function(mover) {
        topic.publish("/dnd/move/stop", mover);
        domClass.remove(win.body(), "dojoMove");
        domClass.remove(this.node, "dojoMoveItem");
      },
      onFirstMove: function() {},
      onMove: function(mover, leftTop) {
        this.onMoving(mover, leftTop);
        var s = mover.node.style;
        s.left = leftTop.l + "px";
        s.top = leftTop.t + "px";
        this.onMoved(mover, leftTop);
      },
      onMoving: function() {},
      onMoved: function() {}
    });
    return Moveable;
  });
})(require('process'));
