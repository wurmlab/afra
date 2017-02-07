/* */ 
"format cjs";
(function(process) {
  define(["./_base/kernel", "./query", "./_base/lang", "./_base/array", "./dom-attr"], function(dojo, query, lang, array, attr) {
    var NodeList = query.NodeList;
    var dataCache = {},
        x = 0,
        dataattr = "data-dojo-dataid",
        dopid = function(node) {
          var pid = attr.get(node, dataattr);
          if (!pid) {
            pid = "pid" + (x++);
            attr.set(node, dataattr, pid);
          }
          return pid;
        };
    ;
    NodeList._nodeDataCache = dojo._nodeDataCache = dataCache;
    var dodata = dojo._nodeData = function(node, key, value) {
      var pid = dopid(node),
          r;
      if (!dataCache[pid]) {
        dataCache[pid] = {};
      }
      if (arguments.length == 1) {
        r = dataCache[pid];
      }
      if (typeof key == "string") {
        if (arguments.length > 2) {
          dataCache[pid][key] = value;
        } else {
          r = dataCache[pid][key];
        }
      } else {
        r = lang.mixin(dataCache[pid], key);
      }
      return r;
    };
    var removeData = dojo._removeNodeData = function(node, key) {
      var pid = dopid(node);
      if (dataCache[pid]) {
        if (key) {
          delete dataCache[pid][key];
        } else {
          delete dataCache[pid];
        }
      }
    };
    NodeList._gcNodeData = dojo._gcNodeData = function() {
      var livePids = query("[" + dataattr + "]").map(dopid);
      for (var i in dataCache) {
        if (array.indexOf(livePids, i) < 0) {
          delete dataCache[i];
        }
      }
    };
    lang.extend(NodeList, {
      data: NodeList._adaptWithCondition(dodata, function(a) {
        return a.length === 0 || a.length == 1 && (typeof a[0] == "string");
      }),
      removeData: NodeList._adaptAsForEach(removeData)
    });
    return NodeList;
  });
})(require('process'));
