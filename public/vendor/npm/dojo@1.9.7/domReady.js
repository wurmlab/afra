/* */ 
"format cjs";
(function(process) {
  define(['./has'], function(has) {
    var global = (function() {
      return this;
    })(),
        doc = document,
        readyStates = {
          'loaded': 1,
          'complete': 1
        },
        fixReadyState = typeof doc.readyState != "string",
        ready = !!readyStates[doc.readyState],
        readyQ = [],
        recursiveGuard;
    function domReady(callback) {
      readyQ.push(callback);
      if (ready) {
        processQ();
      }
    }
    domReady.load = function(id, req, load) {
      domReady(load);
    };
    domReady._Q = readyQ;
    domReady._onQEmpty = function() {};
    if (fixReadyState) {
      doc.readyState = "loading";
    }
    function processQ() {
      if (recursiveGuard) {
        return;
      }
      recursiveGuard = true;
      while (readyQ.length) {
        try {
          (readyQ.shift())(doc);
        } catch (err) {
          console.error(err, "in domReady callback", err.stack);
        }
      }
      recursiveGuard = false;
      domReady._onQEmpty();
    }
    if (!ready) {
      var tests = [],
          detectReady = function(evt) {
            evt = evt || global.event;
            if (ready || (evt.type == "readystatechange" && !readyStates[doc.readyState])) {
              return;
            }
            if (fixReadyState) {
              doc.readyState = "complete";
            }
            ready = 1;
            processQ();
          },
          on = function(node, event) {
            node.addEventListener(event, detectReady, false);
            readyQ.push(function() {
              node.removeEventListener(event, detectReady, false);
            });
          };
      if (!has("dom-addeventlistener")) {
        on = function(node, event) {
          event = "on" + event;
          node.attachEvent(event, detectReady);
          readyQ.push(function() {
            node.detachEvent(event, detectReady);
          });
        };
        var div = doc.createElement("div");
        try {
          if (div.doScroll && global.frameElement === null) {
            tests.push(function() {
              try {
                div.doScroll("left");
                return 1;
              } catch (e) {}
            });
          }
        } catch (e) {}
      }
      on(doc, "DOMContentLoaded");
      on(global, "load");
      if ("onreadystatechange" in doc) {
        on(doc, "readystatechange");
      } else if (!fixReadyState) {
        tests.push(function() {
          return readyStates[doc.readyState];
        });
      }
      if (tests.length) {
        var poller = function() {
          if (ready) {
            return;
          }
          var i = tests.length;
          while (i--) {
            if (tests[i]()) {
              detectReady("poller");
              return;
            }
          }
          setTimeout(poller, 30);
        };
        poller();
      }
    }
    return domReady;
  });
})(require('process'));
