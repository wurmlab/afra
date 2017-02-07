/* */ 
"format cjs";
(function(process) {
  define(["../_base/config", "../_base/json", "../_base/kernel", "../_base/lang", "../_base/xhr", "../sniff", "../_base/window", "../dom", "../dom-construct", "../query", "require", "../aspect", "../request/iframe"], function(config, json, kernel, lang, xhr, has, win, dom, domConstruct, query, require, aspect, _iframe) {
    kernel.deprecated("dojo/io/iframe", "Use dojo/request/iframe.", "2.0");
    var mid = _iframe._iframeName;
    mid = mid.substring(0, mid.lastIndexOf('_'));
    var iframe = lang.delegate(_iframe, {
      create: function() {
        return iframe._frame = _iframe.create.apply(_iframe, arguments);
      },
      get: null,
      post: null,
      send: function(args) {
        var rDfd;
        var dfd = xhr._ioSetArgs(args, function(dfd) {
          rDfd && rDfd.cancel();
        }, function(dfd) {
          var value = null,
              ioArgs = dfd.ioArgs;
          try {
            var handleAs = ioArgs.handleAs;
            if (handleAs === "xml" || handleAs === "html") {
              value = rDfd.response.data;
            } else {
              value = rDfd.response.text;
              if (handleAs === "json") {
                value = json.fromJson(value);
              } else if (handleAs === "javascript") {
                value = kernel.eval(value);
              }
            }
          } catch (e) {
            value = e;
          }
          return value;
        }, function(error, dfd) {
          dfd.ioArgs._hasError = true;
          return error;
        });
        var ioArgs = dfd.ioArgs;
        var method = "GET",
            form = dom.byId(args.form);
        if (args.method && args.method.toUpperCase() === "POST" && form) {
          method = "POST";
        }
        var options = {
          method: method,
          handleAs: args.handleAs === "json" || args.handleAs === "javascript" ? "text" : args.handleAs,
          form: args.form,
          query: form ? null : args.content,
          data: form ? args.content : null,
          timeout: args.timeout,
          ioArgs: ioArgs
        };
        if (options.method) {
          options.method = options.method.toUpperCase();
        }
        if (config.ioPublish && kernel.publish && ioArgs.args.ioPublish !== false) {
          var start = aspect.after(_iframe, "_notifyStart", function(data) {
            if (data.options.ioArgs === ioArgs) {
              start.remove();
              xhr._ioNotifyStart(dfd);
            }
          }, true);
        }
        rDfd = _iframe(ioArgs.url, options, true);
        ioArgs._callNext = rDfd._callNext;
        rDfd.then(function() {
          dfd.resolve(dfd);
        }).otherwise(function(error) {
          dfd.ioArgs.error = error;
          dfd.reject(error);
        });
        return dfd;
      },
      _iframeOnload: win.global[mid + '_onload']
    });
    lang.setObject("dojo.io.iframe", iframe);
    return iframe;
  });
})(require('process'));
