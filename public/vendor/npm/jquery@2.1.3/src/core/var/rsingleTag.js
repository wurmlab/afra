/* */ 
"format cjs";
define(function() {
	// Match a standalone tag
	return (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);
});
