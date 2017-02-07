/* */ 
"format cjs";
(function(process) {
  define(["../dom", "../sniff", "../_base/array", "../_base/lang", "../_base/window"], function(dom, has, array, lang, win) {
    var trim = lang.trim;
    var each = array.forEach;
    var getDoc = function() {
      return win.doc;
    };
    var cssCaseBug = (getDoc().compatMode) == "BackCompat";
    var specials = ">~+";
    var caseSensitive = false;
    var yesman = function() {
      return true;
    };
    var getQueryParts = function(query) {
      if (specials.indexOf(query.slice(-1)) >= 0) {
        query += " * ";
      } else {
        query += " ";
      }
      var ts = function(s, e) {
        return trim(query.slice(s, e));
      };
      var queryParts = [];
      var inBrackets = -1,
          inParens = -1,
          inMatchFor = -1,
          inPseudo = -1,
          inClass = -1,
          inId = -1,
          inTag = -1,
          currentQuoteChar,
          lc = "",
          cc = "",
          pStart;
      var x = 0,
          ql = query.length,
          currentPart = null,
          _cp = null;
      var endTag = function() {
        if (inTag >= 0) {
          var tv = (inTag == x) ? null : ts(inTag, x);
          currentPart[(specials.indexOf(tv) < 0) ? "tag" : "oper"] = tv;
          inTag = -1;
        }
      };
      var endId = function() {
        if (inId >= 0) {
          currentPart.id = ts(inId, x).replace(/\\/g, "");
          inId = -1;
        }
      };
      var endClass = function() {
        if (inClass >= 0) {
          currentPart.classes.push(ts(inClass + 1, x).replace(/\\/g, ""));
          inClass = -1;
        }
      };
      var endAll = function() {
        endId();
        endTag();
        endClass();
      };
      var endPart = function() {
        endAll();
        if (inPseudo >= 0) {
          currentPart.pseudos.push({name: ts(inPseudo + 1, x)});
        }
        currentPart.loops = (currentPart.pseudos.length || currentPart.attrs.length || currentPart.classes.length);
        currentPart.oquery = currentPart.query = ts(pStart, x);
        currentPart.otag = currentPart.tag = (currentPart["oper"]) ? null : (currentPart.tag || "*");
        if (currentPart.tag) {
          currentPart.tag = currentPart.tag.toUpperCase();
        }
        if (queryParts.length && (queryParts[queryParts.length - 1].oper)) {
          currentPart.infixOper = queryParts.pop();
          currentPart.query = currentPart.infixOper.query + " " + currentPart.query;
        }
        queryParts.push(currentPart);
        currentPart = null;
      };
      for (; lc = cc, cc = query.charAt(x), x < ql; x++) {
        if (lc == "\\") {
          continue;
        }
        if (!currentPart) {
          pStart = x;
          currentPart = {
            query: null,
            pseudos: [],
            attrs: [],
            classes: [],
            tag: null,
            oper: null,
            id: null,
            getTag: function() {
              return caseSensitive ? this.otag : this.tag;
            }
          };
          inTag = x;
        }
        if (currentQuoteChar) {
          if (cc == currentQuoteChar) {
            currentQuoteChar = null;
          }
          continue;
        } else if (cc == "'" || cc == '"') {
          currentQuoteChar = cc;
          continue;
        }
        if (inBrackets >= 0) {
          if (cc == "]") {
            if (!_cp.attr) {
              _cp.attr = ts(inBrackets + 1, x);
            } else {
              _cp.matchFor = ts((inMatchFor || inBrackets + 1), x);
            }
            var cmf = _cp.matchFor;
            if (cmf) {
              if ((cmf.charAt(0) == '"') || (cmf.charAt(0) == "'")) {
                _cp.matchFor = cmf.slice(1, -1);
              }
            }
            if (_cp.matchFor) {
              _cp.matchFor = _cp.matchFor.replace(/\\/g, "");
            }
            currentPart.attrs.push(_cp);
            _cp = null;
            inBrackets = inMatchFor = -1;
          } else if (cc == "=") {
            var addToCc = ("|~^$*".indexOf(lc) >= 0) ? lc : "";
            _cp.type = addToCc + cc;
            _cp.attr = ts(inBrackets + 1, x - addToCc.length);
            inMatchFor = x + 1;
          }
        } else if (inParens >= 0) {
          if (cc == ")") {
            if (inPseudo >= 0) {
              _cp.value = ts(inParens + 1, x);
            }
            inPseudo = inParens = -1;
          }
        } else if (cc == "#") {
          endAll();
          inId = x + 1;
        } else if (cc == ".") {
          endAll();
          inClass = x;
        } else if (cc == ":") {
          endAll();
          inPseudo = x;
        } else if (cc == "[") {
          endAll();
          inBrackets = x;
          _cp = {};
        } else if (cc == "(") {
          if (inPseudo >= 0) {
            _cp = {
              name: ts(inPseudo + 1, x),
              value: null
            };
            currentPart.pseudos.push(_cp);
          }
          inParens = x;
        } else if ((cc == " ") && (lc != cc)) {
          endPart();
        }
      }
      return queryParts;
    };
    var agree = function(first, second) {
      if (!first) {
        return second;
      }
      if (!second) {
        return first;
      }
      return function() {
        return first.apply(window, arguments) && second.apply(window, arguments);
      };
    };
    var getArr = function(i, arr) {
      var r = arr || [];
      if (i) {
        r.push(i);
      }
      return r;
    };
    var _isElement = function(n) {
      return (1 == n.nodeType);
    };
    var blank = "";
    var _getAttr = function(elem, attr) {
      if (!elem) {
        return blank;
      }
      if (attr == "class") {
        return elem.className || blank;
      }
      if (attr == "for") {
        return elem.htmlFor || blank;
      }
      if (attr == "style") {
        return elem.style.cssText || blank;
      }
      return (caseSensitive ? elem.getAttribute(attr) : elem.getAttribute(attr, 2)) || blank;
    };
    var attrs = {
      "*=": function(attr, value) {
        return function(elem) {
          return (_getAttr(elem, attr).indexOf(value) >= 0);
        };
      },
      "^=": function(attr, value) {
        return function(elem) {
          return (_getAttr(elem, attr).indexOf(value) == 0);
        };
      },
      "$=": function(attr, value) {
        return function(elem) {
          var ea = " " + _getAttr(elem, attr);
          var lastIndex = ea.lastIndexOf(value);
          return lastIndex > -1 && (lastIndex == (ea.length - value.length));
        };
      },
      "~=": function(attr, value) {
        var tval = " " + value + " ";
        return function(elem) {
          var ea = " " + _getAttr(elem, attr) + " ";
          return (ea.indexOf(tval) >= 0);
        };
      },
      "|=": function(attr, value) {
        var valueDash = value + "-";
        return function(elem) {
          var ea = _getAttr(elem, attr);
          return ((ea == value) || (ea.indexOf(valueDash) == 0));
        };
      },
      "=": function(attr, value) {
        return function(elem) {
          return (_getAttr(elem, attr) == value);
        };
      }
    };
    var _noNES = (typeof getDoc().firstChild.nextElementSibling == "undefined");
    var _ns = !_noNES ? "nextElementSibling" : "nextSibling";
    var _ps = !_noNES ? "previousElementSibling" : "previousSibling";
    var _simpleNodeTest = (_noNES ? _isElement : yesman);
    var _lookLeft = function(node) {
      while (node = node[_ps]) {
        if (_simpleNodeTest(node)) {
          return false;
        }
      }
      return true;
    };
    var _lookRight = function(node) {
      while (node = node[_ns]) {
        if (_simpleNodeTest(node)) {
          return false;
        }
      }
      return true;
    };
    var getNodeIndex = function(node) {
      var root = node.parentNode;
      root = root.nodeType != 7 ? root : root.nextSibling;
      var i = 0,
          tret = root.children || root.childNodes,
          ci = (node["_i"] || node.getAttribute("_i") || -1),
          cl = (root["_l"] || (typeof root.getAttribute !== "undefined" ? root.getAttribute("_l") : -1));
      if (!tret) {
        return -1;
      }
      var l = tret.length;
      if (cl == l && ci >= 0 && cl >= 0) {
        return ci;
      }
      if (has("ie") && typeof root.setAttribute !== "undefined") {
        root.setAttribute("_l", l);
      } else {
        root["_l"] = l;
      }
      ci = -1;
      for (var te = root["firstElementChild"] || root["firstChild"]; te; te = te[_ns]) {
        if (_simpleNodeTest(te)) {
          if (has("ie")) {
            te.setAttribute("_i", ++i);
          } else {
            te["_i"] = ++i;
          }
          if (node === te) {
            ci = i;
          }
        }
      }
      return ci;
    };
    var isEven = function(elem) {
      return !((getNodeIndex(elem)) % 2);
    };
    var isOdd = function(elem) {
      return ((getNodeIndex(elem)) % 2);
    };
    var pseudos = {
      "checked": function(name, condition) {
        return function(elem) {
          return !!("checked" in elem ? elem.checked : elem.selected);
        };
      },
      "disabled": function(name, condition) {
        return function(elem) {
          return elem.disabled;
        };
      },
      "enabled": function(name, condition) {
        return function(elem) {
          return !elem.disabled;
        };
      },
      "first-child": function() {
        return _lookLeft;
      },
      "last-child": function() {
        return _lookRight;
      },
      "only-child": function(name, condition) {
        return function(node) {
          return _lookLeft(node) && _lookRight(node);
        };
      },
      "empty": function(name, condition) {
        return function(elem) {
          var cn = elem.childNodes;
          var cnl = elem.childNodes.length;
          for (var x = cnl - 1; x >= 0; x--) {
            var nt = cn[x].nodeType;
            if ((nt === 1) || (nt == 3)) {
              return false;
            }
          }
          return true;
        };
      },
      "contains": function(name, condition) {
        var cz = condition.charAt(0);
        if (cz == '"' || cz == "'") {
          condition = condition.slice(1, -1);
        }
        return function(elem) {
          return (elem.innerHTML.indexOf(condition) >= 0);
        };
      },
      "not": function(name, condition) {
        var p = getQueryParts(condition)[0];
        var ignores = {el: 1};
        if (p.tag != "*") {
          ignores.tag = 1;
        }
        if (!p.classes.length) {
          ignores.classes = 1;
        }
        var ntf = getSimpleFilterFunc(p, ignores);
        return function(elem) {
          return (!ntf(elem));
        };
      },
      "nth-child": function(name, condition) {
        var pi = parseInt;
        if (condition == "odd") {
          return isOdd;
        } else if (condition == "even") {
          return isEven;
        }
        if (condition.indexOf("n") != -1) {
          var tparts = condition.split("n", 2);
          var pred = tparts[0] ? ((tparts[0] == '-') ? -1 : pi(tparts[0])) : 1;
          var idx = tparts[1] ? pi(tparts[1]) : 0;
          var lb = 0,
              ub = -1;
          if (pred > 0) {
            if (idx < 0) {
              idx = (idx % pred) && (pred + (idx % pred));
            } else if (idx > 0) {
              if (idx >= pred) {
                lb = idx - idx % pred;
              }
              idx = idx % pred;
            }
          } else if (pred < 0) {
            pred *= -1;
            if (idx > 0) {
              ub = idx;
              idx = idx % pred;
            }
          }
          if (pred > 0) {
            return function(elem) {
              var i = getNodeIndex(elem);
              return (i >= lb) && (ub < 0 || i <= ub) && ((i % pred) == idx);
            };
          } else {
            condition = idx;
          }
        }
        var ncount = pi(condition);
        return function(elem) {
          return (getNodeIndex(elem) == ncount);
        };
      }
    };
    var defaultGetter = (has("ie") < 9 || has("ie") == 9 && has("quirks")) ? function(cond) {
      var clc = cond.toLowerCase();
      if (clc == "class") {
        cond = "className";
      }
      return function(elem) {
        return (caseSensitive ? elem.getAttribute(cond) : elem[cond] || elem[clc]);
      };
    } : function(cond) {
      return function(elem) {
        return (elem && elem.getAttribute && elem.hasAttribute(cond));
      };
    };
    var getSimpleFilterFunc = function(query, ignores) {
      if (!query) {
        return yesman;
      }
      ignores = ignores || {};
      var ff = null;
      if (!("el" in ignores)) {
        ff = agree(ff, _isElement);
      }
      if (!("tag" in ignores)) {
        if (query.tag != "*") {
          ff = agree(ff, function(elem) {
            return (elem && ((caseSensitive ? elem.tagName : elem.tagName.toUpperCase()) == query.getTag()));
          });
        }
      }
      if (!("classes" in ignores)) {
        each(query.classes, function(cname, idx, arr) {
          var re = new RegExp("(?:^|\\s)" + cname + "(?:\\s|$)");
          ff = agree(ff, function(elem) {
            return re.test(elem.className);
          });
          ff.count = idx;
        });
      }
      if (!("pseudos" in ignores)) {
        each(query.pseudos, function(pseudo) {
          var pn = pseudo.name;
          if (pseudos[pn]) {
            ff = agree(ff, pseudos[pn](pn, pseudo.value));
          }
        });
      }
      if (!("attrs" in ignores)) {
        each(query.attrs, function(attr) {
          var matcher;
          var a = attr.attr;
          if (attr.type && attrs[attr.type]) {
            matcher = attrs[attr.type](a, attr.matchFor);
          } else if (a.length) {
            matcher = defaultGetter(a);
          }
          if (matcher) {
            ff = agree(ff, matcher);
          }
        });
      }
      if (!("id" in ignores)) {
        if (query.id) {
          ff = agree(ff, function(elem) {
            return (!!elem && (elem.id == query.id));
          });
        }
      }
      if (!ff) {
        if (!("default" in ignores)) {
          ff = yesman;
        }
      }
      return ff;
    };
    var _nextSibling = function(filterFunc) {
      return function(node, ret, bag) {
        while (node = node[_ns]) {
          if (_noNES && (!_isElement(node))) {
            continue;
          }
          if ((!bag || _isUnique(node, bag)) && filterFunc(node)) {
            ret.push(node);
          }
          break;
        }
        return ret;
      };
    };
    var _nextSiblings = function(filterFunc) {
      return function(root, ret, bag) {
        var te = root[_ns];
        while (te) {
          if (_simpleNodeTest(te)) {
            if (bag && !_isUnique(te, bag)) {
              break;
            }
            if (filterFunc(te)) {
              ret.push(te);
            }
          }
          te = te[_ns];
        }
        return ret;
      };
    };
    var _childElements = function(filterFunc) {
      filterFunc = filterFunc || yesman;
      return function(root, ret, bag) {
        var te,
            x = 0,
            tret = root.children || root.childNodes;
        while (te = tret[x++]) {
          if (_simpleNodeTest(te) && (!bag || _isUnique(te, bag)) && (filterFunc(te, x))) {
            ret.push(te);
          }
        }
        return ret;
      };
    };
    var _isDescendant = function(node, root) {
      var pn = node.parentNode;
      while (pn) {
        if (pn == root) {
          break;
        }
        pn = pn.parentNode;
      }
      return !!pn;
    };
    var _getElementsFuncCache = {};
    var getElementsFunc = function(query) {
      var retFunc = _getElementsFuncCache[query.query];
      if (retFunc) {
        return retFunc;
      }
      var io = query.infixOper;
      var oper = (io ? io.oper : "");
      var filterFunc = getSimpleFilterFunc(query, {el: 1});
      var qt = query.tag;
      var wildcardTag = ("*" == qt);
      var ecs = getDoc()["getElementsByClassName"];
      if (!oper) {
        if (query.id) {
          filterFunc = (!query.loops && wildcardTag) ? yesman : getSimpleFilterFunc(query, {
            el: 1,
            id: 1
          });
          retFunc = function(root, arr) {
            var te = dom.byId(query.id, (root.ownerDocument || root));
            if (!te || !filterFunc(te)) {
              return;
            }
            if (9 == root.nodeType) {
              return getArr(te, arr);
            } else {
              if (_isDescendant(te, root)) {
                return getArr(te, arr);
              }
            }
          };
        } else if (ecs && /\{\s*\[native code\]\s*\}/.test(String(ecs)) && query.classes.length && !cssCaseBug) {
          filterFunc = getSimpleFilterFunc(query, {
            el: 1,
            classes: 1,
            id: 1
          });
          var classesString = query.classes.join(" ");
          retFunc = function(root, arr, bag) {
            var ret = getArr(0, arr),
                te,
                x = 0;
            var tret = root.getElementsByClassName(classesString);
            while ((te = tret[x++])) {
              if (filterFunc(te, root) && _isUnique(te, bag)) {
                ret.push(te);
              }
            }
            return ret;
          };
        } else if (!wildcardTag && !query.loops) {
          retFunc = function(root, arr, bag) {
            var ret = getArr(0, arr),
                te,
                x = 0;
            var tag = query.getTag(),
                tret = tag ? root.getElementsByTagName(tag) : [];
            while ((te = tret[x++])) {
              if (_isUnique(te, bag)) {
                ret.push(te);
              }
            }
            return ret;
          };
        } else {
          filterFunc = getSimpleFilterFunc(query, {
            el: 1,
            tag: 1,
            id: 1
          });
          retFunc = function(root, arr, bag) {
            var ret = getArr(0, arr),
                te,
                x = 0;
            var tag = query.getTag(),
                tret = tag ? root.getElementsByTagName(tag) : [];
            while ((te = tret[x++])) {
              if (filterFunc(te, root) && _isUnique(te, bag)) {
                ret.push(te);
              }
            }
            return ret;
          };
        }
      } else {
        var skipFilters = {el: 1};
        if (wildcardTag) {
          skipFilters.tag = 1;
        }
        filterFunc = getSimpleFilterFunc(query, skipFilters);
        if ("+" == oper) {
          retFunc = _nextSibling(filterFunc);
        } else if ("~" == oper) {
          retFunc = _nextSiblings(filterFunc);
        } else if (">" == oper) {
          retFunc = _childElements(filterFunc);
        }
      }
      return _getElementsFuncCache[query.query] = retFunc;
    };
    var filterDown = function(root, queryParts) {
      var candidates = getArr(root),
          qp,
          x,
          te,
          qpl = queryParts.length,
          bag,
          ret;
      for (var i = 0; i < qpl; i++) {
        ret = [];
        qp = queryParts[i];
        x = candidates.length - 1;
        if (x > 0) {
          bag = {};
          ret.nozip = true;
        }
        var gef = getElementsFunc(qp);
        for (var j = 0; (te = candidates[j]); j++) {
          gef(te, ret, bag);
        }
        if (!ret.length) {
          break;
        }
        candidates = ret;
      }
      return ret;
    };
    var _queryFuncCacheDOM = {},
        _queryFuncCacheQSA = {};
    var getStepQueryFunc = function(query) {
      var qparts = getQueryParts(trim(query));
      if (qparts.length == 1) {
        var tef = getElementsFunc(qparts[0]);
        return function(root) {
          var r = tef(root, []);
          if (r) {
            r.nozip = true;
          }
          return r;
        };
      }
      return function(root) {
        return filterDown(root, qparts);
      };
    };
    var noZip = has("ie") ? "commentStrip" : "nozip";
    var qsa = "querySelectorAll";
    var qsaAvail = !!getDoc()[qsa];
    var infixSpaceRe = /\\[>~+]|n\+\d|([^ \\])?([>~+])([^ =])?/g;
    var infixSpaceFunc = function(match, pre, ch, post) {
      return ch ? (pre ? pre + " " : "") + ch + (post ? " " + post : "") : match;
    };
    var attRe = /([^[]*)([^\]]*])?/g;
    var attFunc = function(match, nonAtt, att) {
      return nonAtt.replace(infixSpaceRe, infixSpaceFunc) + (att || "");
    };
    var getQueryFunc = function(query, forceDOM) {
      query = query.replace(attRe, attFunc);
      if (qsaAvail) {
        var qsaCached = _queryFuncCacheQSA[query];
        if (qsaCached && !forceDOM) {
          return qsaCached;
        }
      }
      var domCached = _queryFuncCacheDOM[query];
      if (domCached) {
        return domCached;
      }
      var qcz = query.charAt(0);
      var nospace = (-1 == query.indexOf(" "));
      if ((query.indexOf("#") >= 0) && (nospace)) {
        forceDOM = true;
      }
      var useQSA = (qsaAvail && (!forceDOM) && (specials.indexOf(qcz) == -1) && (!has("ie") || (query.indexOf(":") == -1)) && (!(cssCaseBug && (query.indexOf(".") >= 0))) && (query.indexOf(":contains") == -1) && (query.indexOf(":checked") == -1) && (query.indexOf("|=") == -1));
      if (useQSA) {
        var tq = (specials.indexOf(query.charAt(query.length - 1)) >= 0) ? (query + " *") : query;
        return _queryFuncCacheQSA[query] = function(root) {
          try {
            if (!((9 == root.nodeType) || nospace)) {
              throw "";
            }
            var r = root[qsa](tq);
            r[noZip] = true;
            return r;
          } catch (e) {
            return getQueryFunc(query, true)(root);
          }
        };
      } else {
        var parts = query.match(/([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g);
        return _queryFuncCacheDOM[query] = ((parts.length < 2) ? getStepQueryFunc(query) : function(root) {
          var pindex = 0,
              ret = [],
              tp;
          while ((tp = parts[pindex++])) {
            ret = ret.concat(getStepQueryFunc(tp)(root));
          }
          return ret;
        });
      }
    };
    var _zipIdx = 0;
    var _nodeUID = has("ie") ? function(node) {
      if (caseSensitive) {
        return (node.getAttribute("_uid") || node.setAttribute("_uid", ++_zipIdx) || _zipIdx);
      } else {
        return node.uniqueID;
      }
    } : function(node) {
      return (node._uid || (node._uid = ++_zipIdx));
    };
    var _isUnique = function(node, bag) {
      if (!bag) {
        return 1;
      }
      var id = _nodeUID(node);
      if (!bag[id]) {
        return bag[id] = 1;
      }
      return 0;
    };
    var _zipIdxName = "_zipIdx";
    var _zip = function(arr) {
      if (arr && arr.nozip) {
        return arr;
      }
      if (!arr || !arr.length) {
        return [];
      }
      if (arr.length < 2) {
        return [arr[0]];
      }
      var ret = [];
      _zipIdx++;
      var x,
          te;
      if (has("ie") && caseSensitive) {
        var szidx = _zipIdx + "";
        for (x = 0; x < arr.length; x++) {
          if ((te = arr[x]) && te.getAttribute(_zipIdxName) != szidx) {
            ret.push(te);
            te.setAttribute(_zipIdxName, szidx);
          }
        }
      } else if (has("ie") && arr.commentStrip) {
        try {
          for (x = 0; x < arr.length; x++) {
            if ((te = arr[x]) && _isElement(te)) {
              ret.push(te);
            }
          }
        } catch (e) {}
      } else {
        for (x = 0; x < arr.length; x++) {
          if ((te = arr[x]) && te[_zipIdxName] != _zipIdx) {
            ret.push(te);
            te[_zipIdxName] = _zipIdx;
          }
        }
      }
      return ret;
    };
    var query = function(query, root) {
      root = root || getDoc();
      var od = root.ownerDocument || root;
      caseSensitive = (od.createElement("div").tagName === "div");
      var r = getQueryFunc(query)(root);
      if (r && r.nozip) {
        return r;
      }
      return _zip(r);
    };
    query.filter = function(nodeList, filter, root) {
      var tmpNodeList = [],
          parts = getQueryParts(filter),
          filterFunc = (parts.length == 1 && !/[^\w#\.]/.test(filter)) ? getSimpleFilterFunc(parts[0]) : function(node) {
            return array.indexOf(query(filter, dom.byId(root)), node) != -1;
          };
      for (var x = 0,
          te; te = nodeList[x]; x++) {
        if (filterFunc(te)) {
          tmpNodeList.push(te);
        }
      }
      return tmpNodeList;
    };
    return query;
  });
})(require('process'));
