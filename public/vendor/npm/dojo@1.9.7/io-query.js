/* */ 
"format cjs";
(function(process) {
  define(["./_base/lang"], function(lang) {
    var backstop = {};
    return {
      objectToQuery: function objectToQuery(map) {
        var enc = encodeURIComponent,
            pairs = [];
        for (var name in map) {
          var value = map[name];
          if (value != backstop[name]) {
            var assign = enc(name) + "=";
            if (lang.isArray(value)) {
              for (var i = 0,
                  l = value.length; i < l; ++i) {
                pairs.push(assign + enc(value[i]));
              }
            } else {
              pairs.push(assign + enc(value));
            }
          }
        }
        return pairs.join("&");
      },
      queryToObject: function queryToObject(str) {
        var dec = decodeURIComponent,
            qp = str.split("&"),
            ret = {},
            name,
            val;
        for (var i = 0,
            l = qp.length,
            item; i < l; ++i) {
          item = qp[i];
          if (item.length) {
            var s = item.indexOf("=");
            if (s < 0) {
              name = dec(item);
              val = "";
            } else {
              name = dec(item.slice(0, s));
              val = dec(item.slice(s + 1));
            }
            if (typeof ret[name] == "string") {
              ret[name] = [ret[name]];
            }
            if (lang.isArray(ret[name])) {
              ret[name].push(val);
            } else {
              ret[name] = val;
            }
          }
        }
        return ret;
      }
    };
  });
})(require('process'));
