/* */ 
"format cjs";
(function(process) {
  define(["./kernel", "./sniff", "require", "../io-query", "../dom", "../dom-form", "./Deferred", "./config", "./json", "./lang", "./array", "../on", "../aspect", "../request/watch", "../request/xhr", "../request/util"], function(dojo, has, require, ioq, dom, domForm, Deferred, config, json, lang, array, on, aspect, watch, _xhr, util) {
    dojo._xhrObj = _xhr._create;
    var cfg = dojo.config;
    dojo.objectToQuery = ioq.objectToQuery;
    dojo.queryToObject = ioq.queryToObject;
    dojo.fieldToObject = domForm.fieldToObject;
    dojo.formToObject = domForm.toObject;
    dojo.formToQuery = domForm.toQuery;
    dojo.formToJson = domForm.toJson;
    dojo._blockAsync = false;
    var handlers = dojo._contentHandlers = dojo.contentHandlers = {
      "text": function(xhr) {
        return xhr.responseText;
      },
      "json": function(xhr) {
        return json.fromJson(xhr.responseText || null);
      },
      "json-comment-filtered": function(xhr) {
        if (!config.useCommentedJson) {
          console.warn("Consider using the standard mimetype:application/json." + " json-commenting can introduce security issues. To" + " decrease the chances of hijacking, use the standard the 'json' handler and" + " prefix your json with: {}&&\n" + "Use djConfig.useCommentedJson=true to turn off this message.");
        }
        var value = xhr.responseText;
        var cStartIdx = value.indexOf("\/*");
        var cEndIdx = value.lastIndexOf("*\/");
        if (cStartIdx == -1 || cEndIdx == -1) {
          throw new Error("JSON was not comment filtered");
        }
        return json.fromJson(value.substring(cStartIdx + 2, cEndIdx));
      },
      "javascript": function(xhr) {
        return dojo.eval(xhr.responseText);
      },
      "xml": function(xhr) {
        var result = xhr.responseXML;
        if (result && has("dom-qsa2.1") && !result.querySelectorAll && has("dom-parser")) {
          result = new DOMParser().parseFromString(xhr.responseText, "application/xml");
        }
        if (has("ie")) {
          if ((!result || !result.documentElement)) {
            var ms = function(n) {
              return "MSXML" + n + ".DOMDocument";
            };
            var dp = ["Microsoft.XMLDOM", ms(6), ms(4), ms(3), ms(2)];
            array.some(dp, function(p) {
              try {
                var dom = new ActiveXObject(p);
                dom.async = false;
                dom.loadXML(xhr.responseText);
                result = dom;
              } catch (e) {
                return false;
              }
              return true;
            });
          }
        }
        return result;
      },
      "json-comment-optional": function(xhr) {
        if (xhr.responseText && /^[^{\[]*\/\*/.test(xhr.responseText)) {
          return handlers["json-comment-filtered"](xhr);
        } else {
          return handlers["json"](xhr);
        }
      }
    };
    dojo._ioSetArgs = function(args, canceller, okHandler, errHandler) {
      var ioArgs = {
        args: args,
        url: args.url
      };
      var formObject = null;
      if (args.form) {
        var form = dom.byId(args.form);
        var actnNode = form.getAttributeNode("action");
        ioArgs.url = ioArgs.url || (actnNode ? actnNode.value : null);
        formObject = domForm.toObject(form);
      }
      var miArgs = [{}];
      if (formObject) {
        miArgs.push(formObject);
      }
      if (args.content) {
        miArgs.push(args.content);
      }
      if (args.preventCache) {
        miArgs.push({"dojo.preventCache": new Date().valueOf()});
      }
      ioArgs.query = ioq.objectToQuery(lang.mixin.apply(null, miArgs));
      ioArgs.handleAs = args.handleAs || "text";
      var d = new Deferred(function(dfd) {
        dfd.canceled = true;
        canceller && canceller(dfd);
        var err = dfd.ioArgs.error;
        if (!err) {
          err = new Error("request cancelled");
          err.dojoType = "cancel";
          dfd.ioArgs.error = err;
        }
        return err;
      });
      d.addCallback(okHandler);
      var ld = args.load;
      if (ld && lang.isFunction(ld)) {
        d.addCallback(function(value) {
          return ld.call(args, value, ioArgs);
        });
      }
      var err = args.error;
      if (err && lang.isFunction(err)) {
        d.addErrback(function(value) {
          return err.call(args, value, ioArgs);
        });
      }
      var handle = args.handle;
      if (handle && lang.isFunction(handle)) {
        d.addBoth(function(value) {
          return handle.call(args, value, ioArgs);
        });
      }
      d.addErrback(function(error) {
        return errHandler(error, d);
      });
      if (cfg.ioPublish && dojo.publish && ioArgs.args.ioPublish !== false) {
        d.addCallbacks(function(res) {
          dojo.publish("/dojo/io/load", [d, res]);
          return res;
        }, function(res) {
          dojo.publish("/dojo/io/error", [d, res]);
          return res;
        });
        d.addBoth(function(res) {
          dojo.publish("/dojo/io/done", [d, res]);
          return res;
        });
      }
      d.ioArgs = ioArgs;
      return d;
    };
    var _deferredOk = function(dfd) {
      var ret = handlers[dfd.ioArgs.handleAs](dfd.ioArgs.xhr);
      return ret === undefined ? null : ret;
    };
    var _deferError = function(error, dfd) {
      if (!dfd.ioArgs.args.failOk) {
        console.error(error);
      }
      return error;
    };
    var _checkPubCount = function(dfd) {
      if (_pubCount <= 0) {
        _pubCount = 0;
        if (cfg.ioPublish && dojo.publish && (!dfd || dfd && dfd.ioArgs.args.ioPublish !== false)) {
          dojo.publish("/dojo/io/stop");
        }
      }
    };
    var _pubCount = 0;
    aspect.after(watch, "_onAction", function() {
      _pubCount -= 1;
    });
    aspect.after(watch, "_onInFlight", _checkPubCount);
    dojo._ioCancelAll = watch.cancelAll;
    dojo._ioNotifyStart = function(dfd) {
      if (cfg.ioPublish && dojo.publish && dfd.ioArgs.args.ioPublish !== false) {
        if (!_pubCount) {
          dojo.publish("/dojo/io/start");
        }
        _pubCount += 1;
        dojo.publish("/dojo/io/send", [dfd]);
      }
    };
    dojo._ioWatch = function(dfd, validCheck, ioCheck, resHandle) {
      var args = dfd.ioArgs.options = dfd.ioArgs.args;
      lang.mixin(dfd, {
        response: dfd.ioArgs,
        isValid: function(response) {
          return validCheck(dfd);
        },
        isReady: function(response) {
          return ioCheck(dfd);
        },
        handleResponse: function(response) {
          return resHandle(dfd);
        }
      });
      watch(dfd);
      _checkPubCount(dfd);
    };
    var _defaultContentType = "application/x-www-form-urlencoded";
    dojo._ioAddQueryToUrl = function(ioArgs) {
      if (ioArgs.query.length) {
        ioArgs.url += (ioArgs.url.indexOf("?") == -1 ? "?" : "&") + ioArgs.query;
        ioArgs.query = null;
      }
    };
    dojo.xhr = function(method, args, hasBody) {
      var rDfd;
      var dfd = dojo._ioSetArgs(args, function(dfd) {
        rDfd && rDfd.cancel();
      }, _deferredOk, _deferError);
      var ioArgs = dfd.ioArgs;
      if ("postData" in args) {
        ioArgs.query = args.postData;
      } else if ("putData" in args) {
        ioArgs.query = args.putData;
      } else if ("rawBody" in args) {
        ioArgs.query = args.rawBody;
      } else if ((arguments.length > 2 && !hasBody) || "POST|PUT".indexOf(method.toUpperCase()) === -1) {
        dojo._ioAddQueryToUrl(ioArgs);
      }
      var options = {
        method: method,
        handleAs: "text",
        timeout: args.timeout,
        withCredentials: args.withCredentials,
        ioArgs: ioArgs
      };
      if (typeof args.headers !== 'undefined') {
        options.headers = args.headers;
      }
      if (typeof args.contentType !== 'undefined') {
        if (!options.headers) {
          options.headers = {};
        }
        options.headers['Content-Type'] = args.contentType;
      }
      if (typeof ioArgs.query !== 'undefined') {
        options.data = ioArgs.query;
      }
      if (typeof args.sync !== 'undefined') {
        options.sync = args.sync;
      }
      dojo._ioNotifyStart(dfd);
      try {
        rDfd = _xhr(ioArgs.url, options, true);
      } catch (e) {
        dfd.cancel();
        return dfd;
      }
      dfd.ioArgs.xhr = rDfd.response.xhr;
      rDfd.then(function() {
        dfd.resolve(dfd);
      }).otherwise(function(error) {
        ioArgs.error = error;
        if (error.response) {
          error.status = error.response.status;
          error.responseText = error.response.text;
          error.xhr = error.response.xhr;
        }
        dfd.reject(error);
      });
      return dfd;
    };
    dojo.xhrGet = function(args) {
      return dojo.xhr("GET", args);
    };
    dojo.rawXhrPost = dojo.xhrPost = function(args) {
      return dojo.xhr("POST", args, true);
    };
    dojo.rawXhrPut = dojo.xhrPut = function(args) {
      return dojo.xhr("PUT", args, true);
    };
    dojo.xhrDelete = function(args) {
      return dojo.xhr("DELETE", args);
    };
    dojo._isDocumentOk = function(x) {
      return util.checkStatus(x.status);
    };
    dojo._getText = function(url) {
      var result;
      dojo.xhrGet({
        url: url,
        sync: true,
        load: function(text) {
          result = text;
        }
      });
      return result;
    };
    lang.mixin(dojo.xhr, {
      _xhrObj: dojo._xhrObj,
      fieldToObject: domForm.fieldToObject,
      formToObject: domForm.toObject,
      objectToQuery: ioq.objectToQuery,
      formToQuery: domForm.toQuery,
      formToJson: domForm.toJson,
      queryToObject: ioq.queryToObject,
      contentHandlers: handlers,
      _ioSetArgs: dojo._ioSetArgs,
      _ioCancelAll: dojo._ioCancelAll,
      _ioNotifyStart: dojo._ioNotifyStart,
      _ioWatch: dojo._ioWatch,
      _ioAddQueryToUrl: dojo._ioAddQueryToUrl,
      _isDocumentOk: dojo._isDocumentOk,
      _getText: dojo._getText,
      get: dojo.xhrGet,
      post: dojo.xhrPost,
      put: dojo.xhrPut,
      del: dojo.xhrDelete
    });
    return dojo.xhr;
  });
})(require('process'));
