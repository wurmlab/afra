/* */ 
(function(process) {
  function getJsonpCallback(url) {
    var result = null;
    var idMatch = url.match(/jsonp=(.*?)(&|$)/);
    if (idMatch) {
      result = idMatch[1];
    } else {
      idMatch = url.match(/callback=(.*?)(&|$)/);
      if (idMatch) {
        result = idMatch[1];
      }
    }
    if (result) {
      result = decodeURIComponent(result);
    }
    return result;
  }
  function findJsonpDone() {
    var result = false;
    var scriptUrls = getScriptUrls();
    for (var i = 0; i < scriptUrls.length; i++) {
      var jsonp = getJsonpCallback(scriptUrls[i]);
      if (jsonp) {
        eval(jsonp + "({animalType: 'mammal'});");
        result = true;
        break;
      }
    }
    return result;
  }
  function getScriptUrls() {
    var scripts = document.getElementsByTagName('script');
    var scriptUrls = new Array();
    for (var i = 0; scripts && i < scripts.length; i++) {
      var scriptTag = scripts[i];
      if (scriptTag.id.indexOf("dojo_request_script") == 0) {
        scriptUrls.push(scriptTag.src);
      }
    }
    return scriptUrls;
  }
  function doJsonpCallback() {
    if (!findJsonpDone()) {
      alert('ERROR: Could not jsonp callback!');
    }
  }
  setTimeout(function() {
    doJsonpCallback();
  }, 300);
})(require('process'));
