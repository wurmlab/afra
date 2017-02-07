/* */ 
var http = require('http');
var put = require('../put');
http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  var page = put('html').sendTo(res);
  put(page, 'head script[src=app.js]');
  put(page, 'body div.content', 'Hello, World');
  page.end();
}).listen(81);
