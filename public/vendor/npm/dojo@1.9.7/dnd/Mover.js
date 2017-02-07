/* */ 
"format cjs";
(function(process) {
  define(["../_base/array", "../_base/declare", "../_base/lang", "../sniff", "../_base/window", "../dom", "../dom-geometry", "../dom-style", "../Evented", "../on", "../touch", "./common", "./autoscroll"], function(array, declare, lang, has, win, dom, domGeom, domStyle, Evented, on, touch, dnd, autoscroll) {
    return declare("dojo.dnd.Mover", [Evented], {
      constructor: function(node, e, host) {
        this.node = dom.byId(node);
        this.marginBox = {
          l: e.pageX,
          t: e.pageY
        };
        this.mouseButton = e.button;
        var h = (this.host = host),
            d = node.ownerDocument;
        function stopEvent(e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.events = [on(d, touch.move, lang.hitch(this, "onFirstMove")), on(d, touch.move, lang.hitch(this, "onMouseMove")), on(d, touch.release, lang.hitch(this, "onMouseUp")), on(d, "dragstart", stopEvent), on(d.body, "selectstart", stopEvent)];
        autoscroll.autoScrollStart(d);
        if (h && h.onMoveStart) {
          h.onMoveStart(this);
        }
      },
      onMouseMove: function(e) {
        autoscroll.autoScroll(e);
        var m = this.marginBox;
        this.host.onMove(this, {
          l: m.l + e.pageX,
          t: m.t + e.pageY
        }, e);
        e.preventDefault();
        e.stopPropagation();
      },
      onMouseUp: function(e) {
        if (has("webkit") && has("mac") && this.mouseButton == 2 ? e.button == 0 : this.mouseButton == e.button) {
          this.destroy();
        }
        e.preventDefault();
        e.stopPropagation();
      },
      onFirstMove: function(e) {
        var s = this.node.style,
            l,
            t,
            h = this.host;
        switch (s.position) {
          case "relative":
          case "absolute":
            l = Math.round(parseFloat(s.left)) || 0;
            t = Math.round(parseFloat(s.top)) || 0;
            break;
          default:
            s.position = "absolute";
            var m = domGeom.getMarginBox(this.node);
            var b = win.doc.body;
            var bs = domStyle.getComputedStyle(b);
            var bm = domGeom.getMarginBox(b, bs);
            var bc = domGeom.getContentBox(b, bs);
            l = m.l - (bc.l - bm.l);
            t = m.t - (bc.t - bm.t);
            break;
        }
        this.marginBox.l = l - this.marginBox.l;
        this.marginBox.t = t - this.marginBox.t;
        if (h && h.onFirstMove) {
          h.onFirstMove(this, e);
        }
        this.events.shift().remove();
      },
      destroy: function() {
        array.forEach(this.events, function(handle) {
          handle.remove();
        });
        var h = this.host;
        if (h && h.onMoveStop) {
          h.onMoveStop(this);
        }
        this.events = this.node = this.host = null;
      }
    });
  });
})(require('process'));
