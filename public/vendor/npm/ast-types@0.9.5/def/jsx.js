/* */ 
module.exports = function(fork) {
  fork.use(require('./es7'));
  var types = fork.use(require('../lib/types'));
  var def = types.Type.def;
  var or = types.Type.or;
  var defaults = fork.use(require('../lib/shared')).defaults;
  def("JSXAttribute").bases("Node").build("name", "value").field("name", or(def("JSXIdentifier"), def("JSXNamespacedName"))).field("value", or(def("Literal"), def("JSXExpressionContainer"), null), defaults["null"]);
  def("JSXIdentifier").bases("Identifier").build("name").field("name", String);
  def("JSXNamespacedName").bases("Node").build("namespace", "name").field("namespace", def("JSXIdentifier")).field("name", def("JSXIdentifier"));
  def("JSXMemberExpression").bases("MemberExpression").build("object", "property").field("object", or(def("JSXIdentifier"), def("JSXMemberExpression"))).field("property", def("JSXIdentifier")).field("computed", Boolean, defaults.false);
  var JSXElementName = or(def("JSXIdentifier"), def("JSXNamespacedName"), def("JSXMemberExpression"));
  def("JSXSpreadAttribute").bases("Node").build("argument").field("argument", def("Expression"));
  var JSXAttributes = [or(def("JSXAttribute"), def("JSXSpreadAttribute"))];
  def("JSXExpressionContainer").bases("Expression").build("expression").field("expression", def("Expression"));
  def("JSXElement").bases("Expression").build("openingElement", "closingElement", "children").field("openingElement", def("JSXOpeningElement")).field("closingElement", or(def("JSXClosingElement"), null), defaults["null"]).field("children", [or(def("JSXElement"), def("JSXExpressionContainer"), def("JSXText"), def("Literal"))], defaults.emptyArray).field("name", JSXElementName, function() {
    return this.openingElement.name;
  }, true).field("selfClosing", Boolean, function() {
    return this.openingElement.selfClosing;
  }, true).field("attributes", JSXAttributes, function() {
    return this.openingElement.attributes;
  }, true);
  def("JSXOpeningElement").bases("Node").build("name", "attributes", "selfClosing").field("name", JSXElementName).field("attributes", JSXAttributes, defaults.emptyArray).field("selfClosing", Boolean, defaults["false"]);
  def("JSXClosingElement").bases("Node").build("name").field("name", JSXElementName);
  def("JSXText").bases("Literal").build("value").field("value", String);
  def("JSXEmptyExpression").bases("Expression").build();
};
