/* */ 
"format cjs";
(function(process) {
  define(["./_base/kernel", "./_base/lang"], function(kernel, lang) {
    var string = {};
    lang.setObject("dojo.string", string);
    string.rep = function(str, num) {
      if (num <= 0 || !str) {
        return "";
      }
      var buf = [];
      for (; ; ) {
        if (num & 1) {
          buf.push(str);
        }
        if (!(num >>= 1)) {
          break;
        }
        str += str;
      }
      return buf.join("");
    };
    string.pad = function(text, size, ch, end) {
      if (!ch) {
        ch = '0';
      }
      var out = String(text),
          pad = string.rep(ch, Math.ceil((size - out.length) / ch.length));
      return end ? out + pad : pad + out;
    };
    string.substitute = function(template, map, transform, thisObject) {
      thisObject = thisObject || kernel.global;
      transform = transform ? lang.hitch(thisObject, transform) : function(v) {
        return v;
      };
      return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g, function(match, key, format) {
        var value = lang.getObject(key, false, map);
        if (format) {
          value = lang.getObject(format, false, thisObject).call(thisObject, value, key);
        }
        return transform(value, key).toString();
      });
    };
    string.trim = String.prototype.trim ? lang.trim : function(str) {
      str = str.replace(/^\s+/, '');
      for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
          str = str.substring(0, i + 1);
          break;
        }
      }
      return str;
    };
    return string;
  });
})(require('process'));
