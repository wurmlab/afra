/* */ 
"format cjs";
define("dojo/tests/_base/loader/modules/idFactoryArityExports", function(require, exports, module) {
  var impliedDep = require('./impliedDep4');
  require('../../../../_base/lang').mixin(exports, {
    module: module,
    id: "idFactoryArityExports",
    impliedDep: impliedDep.id
  });
});
