/* */ 
"format cjs";
(function(process) {
  define(["./_base/lang", "./dom", "./io-query", "./json"], function(lang, dom, ioq, json) {
    function setValue(obj, name, value) {
      if (value === null) {
        return;
      }
      var val = obj[name];
      if (typeof val == "string") {
        obj[name] = [val, value];
      } else if (lang.isArray(val)) {
        val.push(value);
      } else {
        obj[name] = value;
      }
    }
    var exclude = "file|submit|image|reset|button";
    var form = {
      fieldToObject: function fieldToObject(inputNode) {
        var ret = null;
        inputNode = dom.byId(inputNode);
        if (inputNode) {
          var _in = inputNode.name,
              type = (inputNode.type || "").toLowerCase();
          if (_in && type && !inputNode.disabled) {
            if (type == "radio" || type == "checkbox") {
              if (inputNode.checked) {
                ret = inputNode.value;
              }
            } else if (inputNode.multiple) {
              ret = [];
              var nodes = [inputNode.firstChild];
              while (nodes.length) {
                for (var node = nodes.pop(); node; node = node.nextSibling) {
                  if (node.nodeType == 1 && node.tagName.toLowerCase() == "option") {
                    if (node.selected) {
                      ret.push(node.value);
                    }
                  } else {
                    if (node.nextSibling) {
                      nodes.push(node.nextSibling);
                    }
                    if (node.firstChild) {
                      nodes.push(node.firstChild);
                    }
                    break;
                  }
                }
              }
            } else {
              ret = inputNode.value;
            }
          }
        }
        return ret;
      },
      toObject: function formToObject(formNode) {
        var ret = {},
            elems = dom.byId(formNode).elements;
        for (var i = 0,
            l = elems.length; i < l; ++i) {
          var item = elems[i],
              _in = item.name,
              type = (item.type || "").toLowerCase();
          if (_in && type && exclude.indexOf(type) < 0 && !item.disabled) {
            setValue(ret, _in, form.fieldToObject(item));
            if (type == "image") {
              ret[_in + ".x"] = ret[_in + ".y"] = ret[_in].x = ret[_in].y = 0;
            }
          }
        }
        return ret;
      },
      toQuery: function formToQuery(formNode) {
        return ioq.objectToQuery(form.toObject(formNode));
      },
      toJson: function formToJson(formNode, prettyPrint) {
        return json.stringify(form.toObject(formNode), null, prettyPrint ? 4 : 0);
      }
    };
    return form;
  });
})(require('process'));
