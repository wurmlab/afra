/* */ 
"format cjs";
(function(process) {
  define(["../_base/array", "../_base/declare", "../_base/Deferred", "../_base/kernel", "../_base/lang", "../_base/url", "../_base/xhr"], function(array, declare, Deferred, kernel, lang, _Url, xhr) {
    return declare("dojo.rpc.RpcService", null, {
      constructor: function(args) {
        if (args) {
          if ((lang.isString(args)) || (args instanceof _Url)) {
            if (args instanceof _Url) {
              var url = args + "";
            } else {
              url = args;
            }
            var def = xhr.get({
              url: url,
              handleAs: "json-comment-optional",
              sync: true
            });
            def.addCallback(this, "processSmd");
            def.addErrback(function() {
              throw new Error("Unable to load SMD from " + args);
            });
          } else if (args.smdStr) {
            this.processSmd(kernel.eval("(" + args.smdStr + ")"));
          } else {
            if (args.serviceUrl) {
              this.serviceUrl = args.serviceUrl;
            }
            this.timeout = args.timeout || 0;
            if ("strictArgChecks" in args) {
              this.strictArgChecks = args.strictArgChecks;
            }
            this.processSmd(args);
          }
        }
      },
      strictArgChecks: true,
      serviceUrl: "",
      parseResults: function(obj) {
        return obj;
      },
      errorCallback: function(deferredRequestHandler) {
        return function(data) {
          deferredRequestHandler.errback(data.message);
        };
      },
      resultCallback: function(deferredRequestHandler) {
        return lang.hitch(this, function(obj) {
          if (obj.error != null) {
            var err;
            if (typeof obj.error == 'object') {
              err = new Error(obj.error.message);
              err.code = obj.error.code;
              err.error = obj.error.error;
            } else {
              err = new Error(obj.error);
            }
            err.id = obj.id;
            err.errorObject = obj;
            deferredRequestHandler.errback(err);
          } else {
            deferredRequestHandler.callback(this.parseResults(obj));
          }
        });
      },
      generateMethod: function(method, parameters, url) {
        return lang.hitch(this, function() {
          var deferredRequestHandler = new Deferred();
          if ((this.strictArgChecks) && (parameters != null) && (arguments.length != parameters.length)) {
            throw new Error("Invalid number of parameters for remote method.");
          } else {
            this.bind(method, lang._toArray(arguments), deferredRequestHandler, url);
          }
          return deferredRequestHandler;
        });
      },
      processSmd: function(object) {
        if (object.methods) {
          array.forEach(object.methods, function(m) {
            if (m && m.name) {
              this[m.name] = this.generateMethod(m.name, m.parameters, m.url || m.serviceUrl || m.serviceURL);
              if (!lang.isFunction(this[m.name])) {
                throw new Error("RpcService: Failed to create" + m.name + "()");
              }
            }
          }, this);
        }
        this.serviceUrl = object.serviceUrl || object.serviceURL;
        this.required = object.required;
        this.smd = object;
      }
    });
  });
})(require('process'));
