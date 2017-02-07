/* */ 
"format cjs";
(function(process) {
  define(['./util', '../errors/RequestTimeoutError', '../errors/CancelError', '../_base/array', '../has!host-browser?../_base/window:', '../has!host-browser?dom-addeventlistener?:../on:'], function(util, RequestTimeoutError, CancelError, array, win, on) {
    var _inFlightIntvl = null,
        _inFlight = [];
    function watchInFlight() {
      var now = +(new Date);
      for (var i = 0,
          dfd; i < _inFlight.length && (dfd = _inFlight[i]); i++) {
        var response = dfd.response,
            options = response.options;
        if ((dfd.isCanceled && dfd.isCanceled()) || (dfd.isValid && !dfd.isValid(response))) {
          _inFlight.splice(i--, 1);
          watch._onAction && watch._onAction();
        } else if (dfd.isReady && dfd.isReady(response)) {
          _inFlight.splice(i--, 1);
          dfd.handleResponse(response);
          watch._onAction && watch._onAction();
        } else if (dfd.startTime) {
          if (dfd.startTime + (options.timeout || 0) < now) {
            _inFlight.splice(i--, 1);
            dfd.cancel(new RequestTimeoutError('Timeout exceeded', response));
            watch._onAction && watch._onAction();
          }
        }
      }
      watch._onInFlight && watch._onInFlight(dfd);
      if (!_inFlight.length) {
        clearInterval(_inFlightIntvl);
        _inFlightIntvl = null;
      }
    }
    function watch(dfd) {
      if (dfd.response.options.timeout) {
        dfd.startTime = +(new Date);
      }
      if (dfd.isFulfilled()) {
        return;
      }
      _inFlight.push(dfd);
      if (!_inFlightIntvl) {
        _inFlightIntvl = setInterval(watchInFlight, 50);
      }
      if (dfd.response.options.sync) {
        watchInFlight();
      }
    }
    watch.cancelAll = function cancelAll() {
      try {
        array.forEach(_inFlight, function(dfd) {
          try {
            dfd.cancel(new CancelError('All requests canceled.'));
          } catch (e) {}
        });
      } catch (e) {}
    };
    if (win && on && win.doc.attachEvent) {
      on(win.global, 'unload', function() {
        watch.cancelAll();
      });
    }
    return watch;
  });
})(require('process'));
