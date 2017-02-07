# plugin-jsx [![Build Status](https://travis-ci.org/floatdrop/plugin-jsx.svg)](https://travis-ci.org/floatdrop/plugin-jsx)

> JSX loader plugin for [jspm](https://jspm.io)

__Deprecation:__ [Use babel](http://facebook.github.io/react/blog/2015/06/12/deprecating-jstransform-and-react-tools.html).

This plugin will translate JSX templates to JS.

To use it you should install it with jspm:

```
jspm install jsx
```

After that you can include JSX templates in your modules:

```js
var Component = require('component.jsx!');
```

### Tests

```bash
npm install
npm test
```
