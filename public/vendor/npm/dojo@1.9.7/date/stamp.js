/* */ 
"format cjs";
(function(process) {
  define(["../_base/lang", "../_base/array"], function(lang, array) {
    var stamp = {};
    lang.setObject("dojo.date.stamp", stamp);
    stamp.fromISOString = function(formattedString, defaultTime) {
      if (!stamp._isoRegExp) {
        stamp._isoRegExp = /^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
      }
      var match = stamp._isoRegExp.exec(formattedString),
          result = null;
      if (match) {
        match.shift();
        if (match[1]) {
          match[1]--;
        }
        if (match[6]) {
          match[6] *= 1000;
        }
        if (defaultTime) {
          defaultTime = new Date(defaultTime);
          array.forEach(array.map(["FullYear", "Month", "Date", "Hours", "Minutes", "Seconds", "Milliseconds"], function(prop) {
            return defaultTime["get" + prop]();
          }), function(value, index) {
            match[index] = match[index] || value;
          });
        }
        result = new Date(match[0] || 1970, match[1] || 0, match[2] || 1, match[3] || 0, match[4] || 0, match[5] || 0, match[6] || 0);
        if (match[0] < 100) {
          result.setFullYear(match[0] || 1970);
        }
        var offset = 0,
            zoneSign = match[7] && match[7].charAt(0);
        if (zoneSign != 'Z') {
          offset = ((match[8] || 0) * 60) + (Number(match[9]) || 0);
          if (zoneSign != '-') {
            offset *= -1;
          }
        }
        if (zoneSign) {
          offset -= result.getTimezoneOffset();
        }
        if (offset) {
          result.setTime(result.getTime() + offset * 60000);
        }
      }
      return result;
    };
    stamp.toISOString = function(dateObject, options) {
      var _ = function(n) {
        return (n < 10) ? "0" + n : n;
      };
      options = options || {};
      var formattedDate = [],
          getter = options.zulu ? "getUTC" : "get",
          date = "";
      if (options.selector != "time") {
        var year = dateObject[getter + "FullYear"]();
        date = ["0000".substr((year + "").length) + year, _(dateObject[getter + "Month"]() + 1), _(dateObject[getter + "Date"]())].join('-');
      }
      formattedDate.push(date);
      if (options.selector != "date") {
        var time = [_(dateObject[getter + "Hours"]()), _(dateObject[getter + "Minutes"]()), _(dateObject[getter + "Seconds"]())].join(':');
        var millis = dateObject[getter + "Milliseconds"]();
        if (options.milliseconds) {
          time += "." + (millis < 100 ? "0" : "") + _(millis);
        }
        if (options.zulu) {
          time += "Z";
        } else if (options.selector != "time") {
          var timezoneOffset = dateObject.getTimezoneOffset();
          var absOffset = Math.abs(timezoneOffset);
          time += (timezoneOffset > 0 ? "-" : "+") + _(Math.floor(absOffset / 60)) + ":" + _(absOffset % 60);
        }
        formattedDate.push(time);
      }
      return formattedDate.join('T');
    };
    return stamp;
  });
})(require('process'));
