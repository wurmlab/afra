/* */ 
"format cjs";
(function(process) {
  define(["exports", "./_base/kernel", "./sniff", "./_base/window", "./dom", "./dom-attr"], function(exports, dojo, has, win, dom, attr) {
    var tagWrap = {
      option: ["select"],
      tbody: ["table"],
      thead: ["table"],
      tfoot: ["table"],
      tr: ["table", "tbody"],
      td: ["table", "tbody", "tr"],
      th: ["table", "thead", "tr"],
      legend: ["fieldset"],
      caption: ["table"],
      colgroup: ["table"],
      col: ["table", "colgroup"],
      li: ["ul"]
    },
        reTag = /<\s*([\w\:]+)/,
        masterNode = {},
        masterNum = 0,
        masterName = "__" + dojo._scopeName + "ToDomId";
    for (var param in tagWrap) {
      if (tagWrap.hasOwnProperty(param)) {
        var tw = tagWrap[param];
        tw.pre = param == "option" ? '<select multiple="multiple">' : "<" + tw.join("><") + ">";
        tw.post = "</" + tw.reverse().join("></") + ">";
      }
    }
    var html5domfix;
    if (has("ie") <= 8) {
      html5domfix = function(doc) {
        doc.__dojo_html5_tested = "yes";
        var div = create('div', {
          innerHTML: "<nav>a</nav>",
          style: {visibility: "hidden"}
        }, doc.body);
        if (div.childNodes.length !== 1) {
          ('abbr article aside audio canvas details figcaption figure footer header ' + 'hgroup mark meter nav output progress section summary time video').replace(/\b\w+\b/g, function(n) {
            doc.createElement(n);
          });
        }
        destroy(div);
      };
    }
    function _insertBefore(node, ref) {
      var parent = ref.parentNode;
      if (parent) {
        parent.insertBefore(node, ref);
      }
    }
    function _insertAfter(node, ref) {
      var parent = ref.parentNode;
      if (parent) {
        if (parent.lastChild == ref) {
          parent.appendChild(node);
        } else {
          parent.insertBefore(node, ref.nextSibling);
        }
      }
    }
    exports.toDom = function toDom(frag, doc) {
      doc = doc || win.doc;
      var masterId = doc[masterName];
      if (!masterId) {
        doc[masterName] = masterId = ++masterNum + "";
        masterNode[masterId] = doc.createElement("div");
      }
      if (has("ie") <= 8) {
        if (!doc.__dojo_html5_tested && doc.body) {
          html5domfix(doc);
        }
      }
      frag += "";
      var match = frag.match(reTag),
          tag = match ? match[1].toLowerCase() : "",
          master = masterNode[masterId],
          wrap,
          i,
          fc,
          df;
      if (match && tagWrap[tag]) {
        wrap = tagWrap[tag];
        master.innerHTML = wrap.pre + frag + wrap.post;
        for (i = wrap.length; i; --i) {
          master = master.firstChild;
        }
      } else {
        master.innerHTML = frag;
      }
      if (master.childNodes.length == 1) {
        return master.removeChild(master.firstChild);
      }
      df = doc.createDocumentFragment();
      while ((fc = master.firstChild)) {
        df.appendChild(fc);
      }
      return df;
    };
    exports.place = function place(node, refNode, position) {
      refNode = dom.byId(refNode);
      if (typeof node == "string") {
        node = /^\s*</.test(node) ? exports.toDom(node, refNode.ownerDocument) : dom.byId(node);
      }
      if (typeof position == "number") {
        var cn = refNode.childNodes;
        if (!cn.length || cn.length <= position) {
          refNode.appendChild(node);
        } else {
          _insertBefore(node, cn[position < 0 ? 0 : position]);
        }
      } else {
        switch (position) {
          case "before":
            _insertBefore(node, refNode);
            break;
          case "after":
            _insertAfter(node, refNode);
            break;
          case "replace":
            refNode.parentNode.replaceChild(node, refNode);
            break;
          case "only":
            exports.empty(refNode);
            refNode.appendChild(node);
            break;
          case "first":
            if (refNode.firstChild) {
              _insertBefore(node, refNode.firstChild);
              break;
            }
          default:
            refNode.appendChild(node);
        }
      }
      return node;
    };
    var create = exports.create = function create(tag, attrs, refNode, pos) {
      var doc = win.doc;
      if (refNode) {
        refNode = dom.byId(refNode);
        doc = refNode.ownerDocument;
      }
      if (typeof tag == "string") {
        tag = doc.createElement(tag);
      }
      if (attrs) {
        attr.set(tag, attrs);
      }
      if (refNode) {
        exports.place(tag, refNode, pos);
      }
      return tag;
    };
    function _empty(node) {
      if (node.canHaveChildren) {
        try {
          node.innerHTML = "";
          return;
        } catch (e) {}
      }
      for (var c; c = node.lastChild; ) {
        _destroy(c, node);
      }
    }
    exports.empty = function empty(node) {
      _empty(dom.byId(node));
    };
    function _destroy(node, parent) {
      if (node.firstChild) {
        _empty(node);
      }
      if (parent) {
        has("ie") && parent.canHaveChildren && "removeNode" in node ? node.removeNode(false) : parent.removeChild(node);
      }
    }
    var destroy = exports.destroy = function destroy(node) {
      node = dom.byId(node);
      if (!node) {
        return;
      }
      _destroy(node, node.parentNode);
    };
  });
})(require('process'));
