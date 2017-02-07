/* */ 
"format cjs";
(function(define) {
  var forDocument,
      fragmentFasterHeuristic = /[-+,> ]/;
  define([], forDocument = function(doc, newFragmentFasterHeuristic) {
    "use strict";
    fragmentFasterHeuristic = newFragmentFasterHeuristic || fragmentFasterHeuristic;
    var selectorParse = /(?:\s*([-+ ,<>]))?\s*(\.|!\.?|#)?([-\w\u00A0-\uFFFF%$|]+)?(?:\[([^\]=]+)=?['"]?([^\]'"]*)['"]?\])?/g,
        undefined,
        namespaceIndex,
        namespaces = false,
        doc = doc || document,
        ieCreateElement = typeof doc.createElement == "object";
    function insertTextNode(element, text) {
      element.appendChild(doc.createTextNode(text));
    }
    function put(topReferenceElement) {
      var fragment,
          lastSelectorArg,
          nextSibling,
          referenceElement,
          current,
          args = arguments,
          returnValue = args[0];
      function insertLastElement() {
        if (current && referenceElement && current != referenceElement) {
          (referenceElement == topReferenceElement && (fragment || (fragment = fragmentFasterHeuristic.test(argument) && doc.createDocumentFragment())) ? fragment : referenceElement).insertBefore(current, nextSibling || null);
        }
      }
      for (var i = 0; i < args.length; i++) {
        var argument = args[i];
        if (typeof argument == "object") {
          lastSelectorArg = false;
          if (argument instanceof Array) {
            current = doc.createDocumentFragment();
            for (var key = 0; key < argument.length; key++) {
              current.appendChild(put(argument[key]));
            }
            argument = current;
          }
          if (argument.nodeType) {
            current = argument;
            insertLastElement();
            referenceElement = argument;
            nextSibling = 0;
          } else {
            for (var key in argument) {
              current[key] = argument[key];
            }
          }
        } else if (lastSelectorArg) {
          lastSelectorArg = false;
          insertTextNode(current, argument);
        } else {
          if (i < 1) {
            topReferenceElement = null;
          }
          lastSelectorArg = true;
          var leftoverCharacters = argument.replace(selectorParse, function(t, combinator, prefix, value, attrName, attrValue) {
            if (combinator) {
              insertLastElement();
              if (combinator == '-' || combinator == '+') {
                referenceElement = (nextSibling = (current || referenceElement)).parentNode;
                current = null;
                if (combinator == "+") {
                  nextSibling = nextSibling.nextSibling;
                }
              } else {
                if (combinator == "<") {
                  referenceElement = current = (current || referenceElement).parentNode;
                } else {
                  if (combinator == ",") {
                    referenceElement = topReferenceElement;
                  } else if (current) {
                    referenceElement = current;
                  }
                  current = null;
                }
                nextSibling = 0;
              }
              if (current) {
                referenceElement = current;
              }
            }
            var tag = !prefix && value;
            if (tag || (!current && (prefix || attrName))) {
              if (tag == "$") {
                insertTextNode(referenceElement, args[++i]);
              } else {
                tag = tag || put.defaultTag;
                var ieInputName = ieCreateElement && args[i + 1] && args[i + 1].name;
                if (ieInputName) {
                  tag = '<' + tag + ' name="' + ieInputName + '">';
                }
                current = namespaces && ~(namespaceIndex = tag.indexOf('|')) ? doc.createElementNS(namespaces[tag.slice(0, namespaceIndex)], tag.slice(namespaceIndex + 1)) : doc.createElement(tag);
              }
            }
            if (prefix) {
              if (value == "$") {
                value = args[++i];
              }
              if (prefix == "#") {
                current.id = value;
              } else {
                var currentClassName = current.className;
                var removed = currentClassName && (" " + currentClassName + " ").replace(" " + value + " ", " ");
                if (prefix == ".") {
                  current.className = currentClassName ? (removed + value).substring(1) : value;
                } else {
                  if (argument == "!") {
                    var parentNode;
                    if (ieCreateElement) {
                      put("div", current, '<').innerHTML = "";
                    } else if (parentNode = current.parentNode) {
                      parentNode.removeChild(current);
                    }
                  } else {
                    removed = removed.substring(1, removed.length - 1);
                    if (removed != currentClassName) {
                      current.className = removed;
                    }
                  }
                }
              }
            }
            if (attrName) {
              if (attrValue == "$") {
                attrValue = args[++i];
              }
              if (attrName == "style") {
                current.style.cssText = attrValue;
              } else {
                var method = attrName.charAt(0) == "!" ? (attrName = attrName.substring(1)) && 'removeAttribute' : 'setAttribute';
                attrValue = attrValue === '' ? attrName : attrValue;
                namespaces && ~(namespaceIndex = attrName.indexOf('|')) ? current[method + "NS"](namespaces[attrName.slice(0, namespaceIndex)], attrName.slice(namespaceIndex + 1), attrValue) : current[method](attrName, attrValue);
              }
            }
            return '';
          });
          if (leftoverCharacters) {
            throw new SyntaxError("Unexpected char " + leftoverCharacters + " in " + argument);
          }
          insertLastElement();
          referenceElement = returnValue = current || referenceElement;
        }
      }
      if (topReferenceElement && fragment) {
        topReferenceElement.appendChild(fragment);
      }
      return returnValue;
    }
    put.addNamespace = function(name, uri) {
      if (doc.createElementNS) {
        (namespaces || (namespaces = {}))[name] = uri;
      } else {
        doc.namespaces.add(name, uri);
      }
    };
    put.defaultTag = "div";
    put.forDocument = forDocument;
    return put;
  });
})(function(id, deps, factory) {
  factory = factory || deps;
  if (typeof define === "function") {
    define([], function() {
      return factory();
    });
  } else if (typeof window == "undefined") {
    require('./node-html')(module, factory);
  } else {
    put = factory();
  }
});
