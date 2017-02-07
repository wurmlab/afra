/* */ 
"format cjs";
(function(process) {
  (function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : (factory((global.acorn = global.acorn || {})));
  }(this, function(exports) {
    'use strict';
    var reservedWords = {
      3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
      5: "class enum extends super const export import",
      6: "enum",
      7: "enum",
      strict: "implements interface let package private protected public static yield",
      strictBind: "eval arguments"
    };
    var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";
    var keywords = {
      5: ecma5AndLessKeywords,
      6: ecma5AndLessKeywords + " const class extends export import super"
    };
    var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fd5\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7ae\ua7b0-\ua7b7\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
    var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d4-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d01-\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf8\u1cf9\u1dc0-\u1df5\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
    var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
    var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
    nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
    var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 17, 26, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 157, 310, 10, 21, 11, 7, 153, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 26, 45, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 785, 52, 76, 44, 33, 24, 27, 35, 42, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 85, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 159, 52, 19, 3, 54, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 86, 25, 391, 63, 32, 0, 449, 56, 264, 8, 2, 36, 18, 0, 50, 29, 881, 921, 103, 110, 18, 195, 2749, 1070, 4050, 582, 8634, 568, 8, 30, 114, 29, 19, 47, 17, 3, 32, 20, 6, 18, 881, 68, 12, 0, 67, 12, 65, 0, 32, 6124, 20, 754, 9486, 1, 3071, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 4149, 196, 60, 67, 1213, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42710, 42, 4148, 12, 221, 3, 5761, 10591, 541];
    var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 1306, 2, 54, 14, 32, 9, 16, 3, 46, 10, 54, 9, 7, 2, 37, 13, 2, 9, 52, 0, 13, 2, 49, 13, 10, 2, 4, 9, 83, 11, 7, 0, 161, 11, 6, 9, 7, 3, 57, 0, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 193, 17, 10, 9, 87, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 84, 14, 5, 9, 423, 9, 838, 7, 2, 7, 17, 9, 57, 21, 2, 13, 19882, 9, 135, 4, 60, 6, 26, 9, 1016, 45, 17, 3, 19723, 1, 5319, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 2214, 6, 110, 6, 6, 9, 792487, 239];
    function isInAstralSet(code, set) {
      var pos = 0x10000;
      for (var i = 0; i < set.length; i += 2) {
        pos += set[i];
        if (pos > code)
          return false;
        pos += set[i + 1];
        if (pos >= code)
          return true;
      }
    }
    function isIdentifierStart(code, astral) {
      if (code < 65)
        return code === 36;
      if (code < 91)
        return true;
      if (code < 97)
        return code === 95;
      if (code < 123)
        return true;
      if (code <= 0xffff)
        return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
      if (astral === false)
        return false;
      return isInAstralSet(code, astralIdentifierStartCodes);
    }
    function isIdentifierChar(code, astral) {
      if (code < 48)
        return code === 36;
      if (code < 58)
        return true;
      if (code < 65)
        return false;
      if (code < 91)
        return true;
      if (code < 97)
        return code === 95;
      if (code < 123)
        return true;
      if (code <= 0xffff)
        return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
      if (astral === false)
        return false;
      return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
    }
    var TokenType = function TokenType(label, conf) {
      if (conf === void 0)
        conf = {};
      this.label = label;
      this.keyword = conf.keyword;
      this.beforeExpr = !!conf.beforeExpr;
      this.startsExpr = !!conf.startsExpr;
      this.isLoop = !!conf.isLoop;
      this.isAssign = !!conf.isAssign;
      this.prefix = !!conf.prefix;
      this.postfix = !!conf.postfix;
      this.binop = conf.binop || null;
      this.updateContext = null;
    };
    function binop(name, prec) {
      return new TokenType(name, {
        beforeExpr: true,
        binop: prec
      });
    }
    var beforeExpr = {beforeExpr: true};
    var startsExpr = {startsExpr: true};
    var keywordTypes = {};
    function kw(name, options) {
      if (options === void 0)
        options = {};
      options.keyword = name;
      return keywordTypes[name] = new TokenType(name, options);
    }
    var tt = {
      num: new TokenType("num", startsExpr),
      regexp: new TokenType("regexp", startsExpr),
      string: new TokenType("string", startsExpr),
      name: new TokenType("name", startsExpr),
      eof: new TokenType("eof"),
      bracketL: new TokenType("[", {
        beforeExpr: true,
        startsExpr: true
      }),
      bracketR: new TokenType("]"),
      braceL: new TokenType("{", {
        beforeExpr: true,
        startsExpr: true
      }),
      braceR: new TokenType("}"),
      parenL: new TokenType("(", {
        beforeExpr: true,
        startsExpr: true
      }),
      parenR: new TokenType(")"),
      comma: new TokenType(",", beforeExpr),
      semi: new TokenType(";", beforeExpr),
      colon: new TokenType(":", beforeExpr),
      dot: new TokenType("."),
      question: new TokenType("?", beforeExpr),
      arrow: new TokenType("=>", beforeExpr),
      template: new TokenType("template"),
      ellipsis: new TokenType("...", beforeExpr),
      backQuote: new TokenType("`", startsExpr),
      dollarBraceL: new TokenType("${", {
        beforeExpr: true,
        startsExpr: true
      }),
      eq: new TokenType("=", {
        beforeExpr: true,
        isAssign: true
      }),
      assign: new TokenType("_=", {
        beforeExpr: true,
        isAssign: true
      }),
      incDec: new TokenType("++/--", {
        prefix: true,
        postfix: true,
        startsExpr: true
      }),
      prefix: new TokenType("prefix", {
        beforeExpr: true,
        prefix: true,
        startsExpr: true
      }),
      logicalOR: binop("||", 1),
      logicalAND: binop("&&", 2),
      bitwiseOR: binop("|", 3),
      bitwiseXOR: binop("^", 4),
      bitwiseAND: binop("&", 5),
      equality: binop("==/!=", 6),
      relational: binop("</>", 7),
      bitShift: binop("<</>>", 8),
      plusMin: new TokenType("+/-", {
        beforeExpr: true,
        binop: 9,
        prefix: true,
        startsExpr: true
      }),
      modulo: binop("%", 10),
      star: binop("*", 10),
      slash: binop("/", 10),
      starstar: new TokenType("**", {beforeExpr: true}),
      _break: kw("break"),
      _case: kw("case", beforeExpr),
      _catch: kw("catch"),
      _continue: kw("continue"),
      _debugger: kw("debugger"),
      _default: kw("default", beforeExpr),
      _do: kw("do", {
        isLoop: true,
        beforeExpr: true
      }),
      _else: kw("else", beforeExpr),
      _finally: kw("finally"),
      _for: kw("for", {isLoop: true}),
      _function: kw("function", startsExpr),
      _if: kw("if"),
      _return: kw("return", beforeExpr),
      _switch: kw("switch"),
      _throw: kw("throw", beforeExpr),
      _try: kw("try"),
      _var: kw("var"),
      _const: kw("const"),
      _while: kw("while", {isLoop: true}),
      _with: kw("with"),
      _new: kw("new", {
        beforeExpr: true,
        startsExpr: true
      }),
      _this: kw("this", startsExpr),
      _super: kw("super", startsExpr),
      _class: kw("class"),
      _extends: kw("extends", beforeExpr),
      _export: kw("export"),
      _import: kw("import"),
      _null: kw("null", startsExpr),
      _true: kw("true", startsExpr),
      _false: kw("false", startsExpr),
      _in: kw("in", {
        beforeExpr: true,
        binop: 7
      }),
      _instanceof: kw("instanceof", {
        beforeExpr: true,
        binop: 7
      }),
      _typeof: kw("typeof", {
        beforeExpr: true,
        prefix: true,
        startsExpr: true
      }),
      _void: kw("void", {
        beforeExpr: true,
        prefix: true,
        startsExpr: true
      }),
      _delete: kw("delete", {
        beforeExpr: true,
        prefix: true,
        startsExpr: true
      })
    };
    var lineBreak = /\r\n?|\n|\u2028|\u2029/;
    var lineBreakG = new RegExp(lineBreak.source, "g");
    function isNewLine(code) {
      return code === 10 || code === 13 || code === 0x2028 || code == 0x2029;
    }
    var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
    var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
    function isArray(obj) {
      return Object.prototype.toString.call(obj) === "[object Array]";
    }
    function has(obj, propName) {
      return Object.prototype.hasOwnProperty.call(obj, propName);
    }
    var Position = function Position(line, col) {
      this.line = line;
      this.column = col;
    };
    Position.prototype.offset = function offset(n) {
      return new Position(this.line, this.column + n);
    };
    var SourceLocation = function SourceLocation(p, start, end) {
      this.start = start;
      this.end = end;
      if (p.sourceFile !== null)
        this.source = p.sourceFile;
    };
    function getLineInfo(input, offset) {
      for (var line = 1,
          cur = 0; ; ) {
        lineBreakG.lastIndex = cur;
        var match = lineBreakG.exec(input);
        if (match && match.index < offset) {
          ++line;
          cur = match.index + match[0].length;
        } else {
          return new Position(line, offset - cur);
        }
      }
    }
    var defaultOptions = {
      ecmaVersion: 6,
      sourceType: "script",
      onInsertedSemicolon: null,
      onTrailingComma: null,
      allowReserved: null,
      allowReturnOutsideFunction: false,
      allowImportExportEverywhere: false,
      allowHashBang: false,
      locations: false,
      onToken: null,
      onComment: null,
      ranges: false,
      program: null,
      sourceFile: null,
      directSourceFile: null,
      preserveParens: false,
      plugins: {}
    };
    function getOptions(opts) {
      var options = {};
      for (var opt in defaultOptions)
        options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt];
      if (options.allowReserved == null)
        options.allowReserved = options.ecmaVersion < 5;
      if (isArray(options.onToken)) {
        var tokens = options.onToken;
        options.onToken = function(token) {
          return tokens.push(token);
        };
      }
      if (isArray(options.onComment))
        options.onComment = pushComment(options, options.onComment);
      return options;
    }
    function pushComment(options, array) {
      return function(block, text, start, end, startLoc, endLoc) {
        var comment = {
          type: block ? 'Block' : 'Line',
          value: text,
          start: start,
          end: end
        };
        if (options.locations)
          comment.loc = new SourceLocation(this, startLoc, endLoc);
        if (options.ranges)
          comment.range = [start, end];
        array.push(comment);
      };
    }
    var plugins = {};
    function keywordRegexp(words) {
      return new RegExp("^(" + words.replace(/ /g, "|") + ")$");
    }
    var Parser = function Parser(options, input, startPos) {
      this.options = options = getOptions(options);
      this.sourceFile = options.sourceFile;
      this.keywords = keywordRegexp(keywords[options.ecmaVersion >= 6 ? 6 : 5]);
      var reserved = options.allowReserved ? "" : reservedWords[options.ecmaVersion] + (options.sourceType == "module" ? " await" : "");
      this.reservedWords = keywordRegexp(reserved);
      var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
      this.reservedWordsStrict = keywordRegexp(reservedStrict);
      this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + reservedWords.strictBind);
      this.input = String(input);
      this.containsEsc = false;
      this.loadPlugins(options.plugins);
      if (startPos) {
        this.pos = startPos;
        this.lineStart = Math.max(0, this.input.lastIndexOf("\n", startPos));
        this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
      } else {
        this.pos = this.lineStart = 0;
        this.curLine = 1;
      }
      this.type = tt.eof;
      this.value = null;
      this.start = this.end = this.pos;
      this.startLoc = this.endLoc = this.curPosition();
      this.lastTokEndLoc = this.lastTokStartLoc = null;
      this.lastTokStart = this.lastTokEnd = this.pos;
      this.context = this.initialContext();
      this.exprAllowed = true;
      this.strict = this.inModule = options.sourceType === "module";
      this.potentialArrowAt = -1;
      this.inFunction = this.inGenerator = false;
      this.labels = [];
      if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === '#!')
        this.skipLineComment(2);
    };
    Parser.prototype.isKeyword = function isKeyword(word) {
      return this.keywords.test(word);
    };
    Parser.prototype.isReservedWord = function isReservedWord(word) {
      return this.reservedWords.test(word);
    };
    Parser.prototype.extend = function extend(name, f) {
      this[name] = f(this[name]);
    };
    Parser.prototype.loadPlugins = function loadPlugins(pluginConfigs) {
      var this$1 = this;
      for (var name in pluginConfigs) {
        var plugin = plugins[name];
        if (!plugin)
          throw new Error("Plugin '" + name + "' not found");
        plugin(this$1, pluginConfigs[name]);
      }
    };
    Parser.prototype.parse = function parse() {
      var node = this.options.program || this.startNode();
      this.nextToken();
      return this.parseTopLevel(node);
    };
    var pp = Parser.prototype;
    pp.isUseStrict = function(stmt) {
      return this.options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && stmt.expression.raw.slice(1, -1) === "use strict";
    };
    pp.eat = function(type) {
      if (this.type === type) {
        this.next();
        return true;
      } else {
        return false;
      }
    };
    pp.isContextual = function(name) {
      return this.type === tt.name && this.value === name;
    };
    pp.eatContextual = function(name) {
      return this.value === name && this.eat(tt.name);
    };
    pp.expectContextual = function(name) {
      if (!this.eatContextual(name))
        this.unexpected();
    };
    pp.canInsertSemicolon = function() {
      return this.type === tt.eof || this.type === tt.braceR || lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
    };
    pp.insertSemicolon = function() {
      if (this.canInsertSemicolon()) {
        if (this.options.onInsertedSemicolon)
          this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
        return true;
      }
    };
    pp.semicolon = function() {
      if (!this.eat(tt.semi) && !this.insertSemicolon())
        this.unexpected();
    };
    pp.afterTrailingComma = function(tokType) {
      if (this.type == tokType) {
        if (this.options.onTrailingComma)
          this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
        this.next();
        return true;
      }
    };
    pp.expect = function(type) {
      this.eat(type) || this.unexpected();
    };
    pp.unexpected = function(pos) {
      this.raise(pos != null ? pos : this.start, "Unexpected token");
    };
    var DestructuringErrors = function DestructuringErrors() {
      this.shorthandAssign = 0;
      this.trailingComma = 0;
    };
    pp.checkPatternErrors = function(refDestructuringErrors, andThrow) {
      var trailing = refDestructuringErrors && refDestructuringErrors.trailingComma;
      if (!andThrow)
        return !!trailing;
      if (trailing)
        this.raise(trailing, "Comma is not permitted after the rest element");
    };
    pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
      var pos = refDestructuringErrors && refDestructuringErrors.shorthandAssign;
      if (!andThrow)
        return !!pos;
      if (pos)
        this.raise(pos, "Shorthand property assignments are valid only in destructuring patterns");
    };
    var pp$1 = Parser.prototype;
    pp$1.parseTopLevel = function(node) {
      var this$1 = this;
      var first = true;
      if (!node.body)
        node.body = [];
      while (this.type !== tt.eof) {
        var stmt = this$1.parseStatement(true, true);
        node.body.push(stmt);
        if (first) {
          if (this$1.isUseStrict(stmt))
            this$1.setStrict(true);
          first = false;
        }
      }
      this.next();
      if (this.options.ecmaVersion >= 6) {
        node.sourceType = this.options.sourceType;
      }
      return this.finishNode(node, "Program");
    };
    var loopLabel = {kind: "loop"};
    var switchLabel = {kind: "switch"};
    pp$1.isLet = function() {
      if (this.type !== tt.name || this.options.ecmaVersion < 6 || this.value != "let")
        return false;
      skipWhiteSpace.lastIndex = this.pos;
      var skip = skipWhiteSpace.exec(this.input);
      var next = this.pos + skip[0].length,
          nextCh = this.input.charCodeAt(next);
      if (nextCh === 91 || nextCh == 123)
        return true;
      if (isIdentifierStart(nextCh, true)) {
        for (var pos = next + 1; isIdentifierChar(this.input.charCodeAt(pos), true); ++pos) {}
        var ident = this.input.slice(next, pos);
        if (!this.isKeyword(ident))
          return true;
      }
      return false;
    };
    pp$1.parseStatement = function(declaration, topLevel) {
      var starttype = this.type,
          node = this.startNode(),
          kind;
      if (this.isLet()) {
        starttype = tt._var;
        kind = "let";
      }
      switch (starttype) {
        case tt._break:
        case tt._continue:
          return this.parseBreakContinueStatement(node, starttype.keyword);
        case tt._debugger:
          return this.parseDebuggerStatement(node);
        case tt._do:
          return this.parseDoStatement(node);
        case tt._for:
          return this.parseForStatement(node);
        case tt._function:
          if (!declaration && this.options.ecmaVersion >= 6)
            this.unexpected();
          return this.parseFunctionStatement(node);
        case tt._class:
          if (!declaration)
            this.unexpected();
          return this.parseClass(node, true);
        case tt._if:
          return this.parseIfStatement(node);
        case tt._return:
          return this.parseReturnStatement(node);
        case tt._switch:
          return this.parseSwitchStatement(node);
        case tt._throw:
          return this.parseThrowStatement(node);
        case tt._try:
          return this.parseTryStatement(node);
        case tt._const:
        case tt._var:
          kind = kind || this.value;
          if (!declaration && kind != "var")
            this.unexpected();
          return this.parseVarStatement(node, kind);
        case tt._while:
          return this.parseWhileStatement(node);
        case tt._with:
          return this.parseWithStatement(node);
        case tt.braceL:
          return this.parseBlock();
        case tt.semi:
          return this.parseEmptyStatement(node);
        case tt._export:
        case tt._import:
          if (!this.options.allowImportExportEverywhere) {
            if (!topLevel)
              this.raise(this.start, "'import' and 'export' may only appear at the top level");
            if (!this.inModule)
              this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'");
          }
          return starttype === tt._import ? this.parseImport(node) : this.parseExport(node);
        default:
          var maybeName = this.value,
              expr = this.parseExpression();
          if (starttype === tt.name && expr.type === "Identifier" && this.eat(tt.colon))
            return this.parseLabeledStatement(node, maybeName, expr);
          else
            return this.parseExpressionStatement(node, expr);
      }
    };
    pp$1.parseBreakContinueStatement = function(node, keyword) {
      var this$1 = this;
      var isBreak = keyword == "break";
      this.next();
      if (this.eat(tt.semi) || this.insertSemicolon())
        node.label = null;
      else if (this.type !== tt.name)
        this.unexpected();
      else {
        node.label = this.parseIdent();
        this.semicolon();
      }
      for (var i = 0; i < this.labels.length; ++i) {
        var lab = this$1.labels[i];
        if (node.label == null || lab.name === node.label.name) {
          if (lab.kind != null && (isBreak || lab.kind === "loop"))
            break;
          if (node.label && isBreak)
            break;
        }
      }
      if (i === this.labels.length)
        this.raise(node.start, "Unsyntactic " + keyword);
      return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
    };
    pp$1.parseDebuggerStatement = function(node) {
      this.next();
      this.semicolon();
      return this.finishNode(node, "DebuggerStatement");
    };
    pp$1.parseDoStatement = function(node) {
      this.next();
      this.labels.push(loopLabel);
      node.body = this.parseStatement(false);
      this.labels.pop();
      this.expect(tt._while);
      node.test = this.parseParenExpression();
      if (this.options.ecmaVersion >= 6)
        this.eat(tt.semi);
      else
        this.semicolon();
      return this.finishNode(node, "DoWhileStatement");
    };
    pp$1.parseForStatement = function(node) {
      this.next();
      this.labels.push(loopLabel);
      this.expect(tt.parenL);
      if (this.type === tt.semi)
        return this.parseFor(node, null);
      var isLet = this.isLet();
      if (this.type === tt._var || this.type === tt._const || isLet) {
        var init$1 = this.startNode(),
            kind = isLet ? "let" : this.value;
        this.next();
        this.parseVar(init$1, true, kind);
        this.finishNode(init$1, "VariableDeclaration");
        if ((this.type === tt._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1 && !(kind !== "var" && init$1.declarations[0].init))
          return this.parseForIn(node, init$1);
        return this.parseFor(node, init$1);
      }
      var refDestructuringErrors = new DestructuringErrors;
      var init = this.parseExpression(true, refDestructuringErrors);
      if (this.type === tt._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
        this.checkPatternErrors(refDestructuringErrors, true);
        this.toAssignable(init);
        this.checkLVal(init);
        return this.parseForIn(node, init);
      } else {
        this.checkExpressionErrors(refDestructuringErrors, true);
      }
      return this.parseFor(node, init);
    };
    pp$1.parseFunctionStatement = function(node) {
      this.next();
      return this.parseFunction(node, true);
    };
    pp$1.parseIfStatement = function(node) {
      this.next();
      node.test = this.parseParenExpression();
      node.consequent = this.parseStatement(false);
      node.alternate = this.eat(tt._else) ? this.parseStatement(false) : null;
      return this.finishNode(node, "IfStatement");
    };
    pp$1.parseReturnStatement = function(node) {
      if (!this.inFunction && !this.options.allowReturnOutsideFunction)
        this.raise(this.start, "'return' outside of function");
      this.next();
      if (this.eat(tt.semi) || this.insertSemicolon())
        node.argument = null;
      else {
        node.argument = this.parseExpression();
        this.semicolon();
      }
      return this.finishNode(node, "ReturnStatement");
    };
    pp$1.parseSwitchStatement = function(node) {
      var this$1 = this;
      this.next();
      node.discriminant = this.parseParenExpression();
      node.cases = [];
      this.expect(tt.braceL);
      this.labels.push(switchLabel);
      for (var cur,
          sawDefault = false; this.type != tt.braceR; ) {
        if (this$1.type === tt._case || this$1.type === tt._default) {
          var isCase = this$1.type === tt._case;
          if (cur)
            this$1.finishNode(cur, "SwitchCase");
          node.cases.push(cur = this$1.startNode());
          cur.consequent = [];
          this$1.next();
          if (isCase) {
            cur.test = this$1.parseExpression();
          } else {
            if (sawDefault)
              this$1.raiseRecoverable(this$1.lastTokStart, "Multiple default clauses");
            sawDefault = true;
            cur.test = null;
          }
          this$1.expect(tt.colon);
        } else {
          if (!cur)
            this$1.unexpected();
          cur.consequent.push(this$1.parseStatement(true));
        }
      }
      if (cur)
        this.finishNode(cur, "SwitchCase");
      this.next();
      this.labels.pop();
      return this.finishNode(node, "SwitchStatement");
    };
    pp$1.parseThrowStatement = function(node) {
      this.next();
      if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
        this.raise(this.lastTokEnd, "Illegal newline after throw");
      node.argument = this.parseExpression();
      this.semicolon();
      return this.finishNode(node, "ThrowStatement");
    };
    var empty = [];
    pp$1.parseTryStatement = function(node) {
      this.next();
      node.block = this.parseBlock();
      node.handler = null;
      if (this.type === tt._catch) {
        var clause = this.startNode();
        this.next();
        this.expect(tt.parenL);
        clause.param = this.parseBindingAtom();
        this.checkLVal(clause.param, true);
        this.expect(tt.parenR);
        clause.body = this.parseBlock();
        node.handler = this.finishNode(clause, "CatchClause");
      }
      node.finalizer = this.eat(tt._finally) ? this.parseBlock() : null;
      if (!node.handler && !node.finalizer)
        this.raise(node.start, "Missing catch or finally clause");
      return this.finishNode(node, "TryStatement");
    };
    pp$1.parseVarStatement = function(node, kind) {
      this.next();
      this.parseVar(node, false, kind);
      this.semicolon();
      return this.finishNode(node, "VariableDeclaration");
    };
    pp$1.parseWhileStatement = function(node) {
      this.next();
      node.test = this.parseParenExpression();
      this.labels.push(loopLabel);
      node.body = this.parseStatement(false);
      this.labels.pop();
      return this.finishNode(node, "WhileStatement");
    };
    pp$1.parseWithStatement = function(node) {
      if (this.strict)
        this.raise(this.start, "'with' in strict mode");
      this.next();
      node.object = this.parseParenExpression();
      node.body = this.parseStatement(false);
      return this.finishNode(node, "WithStatement");
    };
    pp$1.parseEmptyStatement = function(node) {
      this.next();
      return this.finishNode(node, "EmptyStatement");
    };
    pp$1.parseLabeledStatement = function(node, maybeName, expr) {
      var this$1 = this;
      for (var i = 0; i < this.labels.length; ++i)
        if (this$1.labels[i].name === maybeName)
          this$1.raise(expr.start, "Label '" + maybeName + "' is already declared");
      var kind = this.type.isLoop ? "loop" : this.type === tt._switch ? "switch" : null;
      for (var i$1 = this.labels.length - 1; i$1 >= 0; i$1--) {
        var label = this$1.labels[i$1];
        if (label.statementStart == node.start) {
          label.statementStart = this$1.start;
          label.kind = kind;
        } else
          break;
      }
      this.labels.push({
        name: maybeName,
        kind: kind,
        statementStart: this.start
      });
      node.body = this.parseStatement(true);
      this.labels.pop();
      node.label = expr;
      return this.finishNode(node, "LabeledStatement");
    };
    pp$1.parseExpressionStatement = function(node, expr) {
      node.expression = expr;
      this.semicolon();
      return this.finishNode(node, "ExpressionStatement");
    };
    pp$1.parseBlock = function(allowStrict) {
      var this$1 = this;
      var node = this.startNode(),
          first = true,
          oldStrict;
      node.body = [];
      this.expect(tt.braceL);
      while (!this.eat(tt.braceR)) {
        var stmt = this$1.parseStatement(true);
        node.body.push(stmt);
        if (first && allowStrict && this$1.isUseStrict(stmt)) {
          oldStrict = this$1.strict;
          this$1.setStrict(this$1.strict = true);
        }
        first = false;
      }
      if (oldStrict === false)
        this.setStrict(false);
      return this.finishNode(node, "BlockStatement");
    };
    pp$1.parseFor = function(node, init) {
      node.init = init;
      this.expect(tt.semi);
      node.test = this.type === tt.semi ? null : this.parseExpression();
      this.expect(tt.semi);
      node.update = this.type === tt.parenR ? null : this.parseExpression();
      this.expect(tt.parenR);
      node.body = this.parseStatement(false);
      this.labels.pop();
      return this.finishNode(node, "ForStatement");
    };
    pp$1.parseForIn = function(node, init) {
      var type = this.type === tt._in ? "ForInStatement" : "ForOfStatement";
      this.next();
      node.left = init;
      node.right = this.parseExpression();
      this.expect(tt.parenR);
      node.body = this.parseStatement(false);
      this.labels.pop();
      return this.finishNode(node, type);
    };
    pp$1.parseVar = function(node, isFor, kind) {
      var this$1 = this;
      node.declarations = [];
      node.kind = kind;
      for (; ; ) {
        var decl = this$1.startNode();
        this$1.parseVarId(decl);
        if (this$1.eat(tt.eq)) {
          decl.init = this$1.parseMaybeAssign(isFor);
        } else if (kind === "const" && !(this$1.type === tt._in || (this$1.options.ecmaVersion >= 6 && this$1.isContextual("of")))) {
          this$1.unexpected();
        } else if (decl.id.type != "Identifier" && !(isFor && (this$1.type === tt._in || this$1.isContextual("of")))) {
          this$1.raise(this$1.lastTokEnd, "Complex binding patterns require an initialization value");
        } else {
          decl.init = null;
        }
        node.declarations.push(this$1.finishNode(decl, "VariableDeclarator"));
        if (!this$1.eat(tt.comma))
          break;
      }
      return node;
    };
    pp$1.parseVarId = function(decl) {
      decl.id = this.parseBindingAtom();
      this.checkLVal(decl.id, true);
    };
    pp$1.parseFunction = function(node, isStatement, allowExpressionBody) {
      this.initFunction(node);
      if (this.options.ecmaVersion >= 6)
        node.generator = this.eat(tt.star);
      var oldInGen = this.inGenerator;
      this.inGenerator = node.generator;
      if (isStatement || this.type === tt.name)
        node.id = this.parseIdent();
      this.parseFunctionParams(node);
      this.parseFunctionBody(node, allowExpressionBody);
      this.inGenerator = oldInGen;
      return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
    };
    pp$1.parseFunctionParams = function(node) {
      this.expect(tt.parenL);
      node.params = this.parseBindingList(tt.parenR, false, false, true);
    };
    pp$1.parseClass = function(node, isStatement) {
      var this$1 = this;
      this.next();
      this.parseClassId(node, isStatement);
      this.parseClassSuper(node);
      var classBody = this.startNode();
      var hadConstructor = false;
      classBody.body = [];
      this.expect(tt.braceL);
      while (!this.eat(tt.braceR)) {
        if (this$1.eat(tt.semi))
          continue;
        var method = this$1.startNode();
        var isGenerator = this$1.eat(tt.star);
        var isMaybeStatic = this$1.type === tt.name && this$1.value === "static";
        this$1.parsePropertyName(method);
        method.static = isMaybeStatic && this$1.type !== tt.parenL;
        if (method.static) {
          if (isGenerator)
            this$1.unexpected();
          isGenerator = this$1.eat(tt.star);
          this$1.parsePropertyName(method);
        }
        method.kind = "method";
        var isGetSet = false;
        if (!method.computed) {
          var key = method.key;
          if (!isGenerator && key.type === "Identifier" && this$1.type !== tt.parenL && (key.name === "get" || key.name === "set")) {
            isGetSet = true;
            method.kind = key.name;
            key = this$1.parsePropertyName(method);
          }
          if (!method.static && (key.type === "Identifier" && key.name === "constructor" || key.type === "Literal" && key.value === "constructor")) {
            if (hadConstructor)
              this$1.raise(key.start, "Duplicate constructor in the same class");
            if (isGetSet)
              this$1.raise(key.start, "Constructor can't have get/set modifier");
            if (isGenerator)
              this$1.raise(key.start, "Constructor can't be a generator");
            method.kind = "constructor";
            hadConstructor = true;
          }
        }
        this$1.parseClassMethod(classBody, method, isGenerator);
        if (isGetSet) {
          var paramCount = method.kind === "get" ? 0 : 1;
          if (method.value.params.length !== paramCount) {
            var start = method.value.start;
            if (method.kind === "get")
              this$1.raiseRecoverable(start, "getter should have no params");
            else
              this$1.raiseRecoverable(start, "setter should have exactly one param");
          }
          if (method.kind === "set" && method.value.params[0].type === "RestElement")
            this$1.raise(method.value.params[0].start, "Setter cannot use rest params");
        }
      }
      node.body = this.finishNode(classBody, "ClassBody");
      return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
    };
    pp$1.parseClassMethod = function(classBody, method, isGenerator) {
      method.value = this.parseMethod(isGenerator);
      classBody.body.push(this.finishNode(method, "MethodDefinition"));
    };
    pp$1.parseClassId = function(node, isStatement) {
      node.id = this.type === tt.name ? this.parseIdent() : isStatement ? this.unexpected() : null;
    };
    pp$1.parseClassSuper = function(node) {
      node.superClass = this.eat(tt._extends) ? this.parseExprSubscripts() : null;
    };
    pp$1.parseExport = function(node) {
      var this$1 = this;
      this.next();
      if (this.eat(tt.star)) {
        this.expectContextual("from");
        node.source = this.type === tt.string ? this.parseExprAtom() : this.unexpected();
        this.semicolon();
        return this.finishNode(node, "ExportAllDeclaration");
      }
      if (this.eat(tt._default)) {
        var parens = this.type == tt.parenL;
        var expr = this.parseMaybeAssign();
        var needsSemi = true;
        if (!parens && (expr.type == "FunctionExpression" || expr.type == "ClassExpression")) {
          needsSemi = false;
          if (expr.id) {
            expr.type = expr.type == "FunctionExpression" ? "FunctionDeclaration" : "ClassDeclaration";
          }
        }
        node.declaration = expr;
        if (needsSemi)
          this.semicolon();
        return this.finishNode(node, "ExportDefaultDeclaration");
      }
      if (this.shouldParseExportStatement()) {
        node.declaration = this.parseStatement(true);
        node.specifiers = [];
        node.source = null;
      } else {
        node.declaration = null;
        node.specifiers = this.parseExportSpecifiers();
        if (this.eatContextual("from")) {
          node.source = this.type === tt.string ? this.parseExprAtom() : this.unexpected();
        } else {
          for (var i = 0; i < node.specifiers.length; i++) {
            if (this$1.keywords.test(node.specifiers[i].local.name) || this$1.reservedWords.test(node.specifiers[i].local.name)) {
              this$1.unexpected(node.specifiers[i].local.start);
            }
          }
          node.source = null;
        }
        this.semicolon();
      }
      return this.finishNode(node, "ExportNamedDeclaration");
    };
    pp$1.shouldParseExportStatement = function() {
      return this.type.keyword || this.isLet();
    };
    pp$1.parseExportSpecifiers = function() {
      var this$1 = this;
      var nodes = [],
          first = true;
      this.expect(tt.braceL);
      while (!this.eat(tt.braceR)) {
        if (!first) {
          this$1.expect(tt.comma);
          if (this$1.afterTrailingComma(tt.braceR))
            break;
        } else
          first = false;
        var node = this$1.startNode();
        node.local = this$1.parseIdent(this$1.type === tt._default);
        node.exported = this$1.eatContextual("as") ? this$1.parseIdent(true) : node.local;
        nodes.push(this$1.finishNode(node, "ExportSpecifier"));
      }
      return nodes;
    };
    pp$1.parseImport = function(node) {
      this.next();
      if (this.type === tt.string) {
        node.specifiers = empty;
        node.source = this.parseExprAtom();
      } else {
        node.specifiers = this.parseImportSpecifiers();
        this.expectContextual("from");
        node.source = this.type === tt.string ? this.parseExprAtom() : this.unexpected();
      }
      this.semicolon();
      return this.finishNode(node, "ImportDeclaration");
    };
    pp$1.parseImportSpecifiers = function() {
      var this$1 = this;
      var nodes = [],
          first = true;
      if (this.type === tt.name) {
        var node = this.startNode();
        node.local = this.parseIdent();
        this.checkLVal(node.local, true);
        nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
        if (!this.eat(tt.comma))
          return nodes;
      }
      if (this.type === tt.star) {
        var node$1 = this.startNode();
        this.next();
        this.expectContextual("as");
        node$1.local = this.parseIdent();
        this.checkLVal(node$1.local, true);
        nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
        return nodes;
      }
      this.expect(tt.braceL);
      while (!this.eat(tt.braceR)) {
        if (!first) {
          this$1.expect(tt.comma);
          if (this$1.afterTrailingComma(tt.braceR))
            break;
        } else
          first = false;
        var node$2 = this$1.startNode();
        node$2.imported = this$1.parseIdent(true);
        if (this$1.eatContextual("as")) {
          node$2.local = this$1.parseIdent();
        } else {
          node$2.local = node$2.imported;
          if (this$1.isKeyword(node$2.local.name))
            this$1.unexpected(node$2.local.start);
          if (this$1.reservedWordsStrict.test(node$2.local.name))
            this$1.raise(node$2.local.start, "The keyword '" + node$2.local.name + "' is reserved");
        }
        this$1.checkLVal(node$2.local, true);
        nodes.push(this$1.finishNode(node$2, "ImportSpecifier"));
      }
      return nodes;
    };
    var pp$2 = Parser.prototype;
    pp$2.toAssignable = function(node, isBinding) {
      var this$1 = this;
      if (this.options.ecmaVersion >= 6 && node) {
        switch (node.type) {
          case "Identifier":
          case "ObjectPattern":
          case "ArrayPattern":
            break;
          case "ObjectExpression":
            node.type = "ObjectPattern";
            for (var i = 0; i < node.properties.length; i++) {
              var prop = node.properties[i];
              if (prop.kind !== "init")
                this$1.raise(prop.key.start, "Object pattern can't contain getter or setter");
              this$1.toAssignable(prop.value, isBinding);
            }
            break;
          case "ArrayExpression":
            node.type = "ArrayPattern";
            this.toAssignableList(node.elements, isBinding);
            break;
          case "AssignmentExpression":
            if (node.operator === "=") {
              node.type = "AssignmentPattern";
              delete node.operator;
            } else {
              this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
              break;
            }
          case "AssignmentPattern":
            if (node.right.type === "YieldExpression")
              this.raise(node.right.start, "Yield expression cannot be a default value");
            break;
          case "ParenthesizedExpression":
            node.expression = this.toAssignable(node.expression, isBinding);
            break;
          case "MemberExpression":
            if (!isBinding)
              break;
          default:
            this.raise(node.start, "Assigning to rvalue");
        }
      }
      return node;
    };
    pp$2.toAssignableList = function(exprList, isBinding) {
      var this$1 = this;
      var end = exprList.length;
      if (end) {
        var last = exprList[end - 1];
        if (last && last.type == "RestElement") {
          --end;
        } else if (last && last.type == "SpreadElement") {
          last.type = "RestElement";
          var arg = last.argument;
          this.toAssignable(arg, isBinding);
          if (arg.type !== "Identifier" && arg.type !== "MemberExpression" && arg.type !== "ArrayPattern")
            this.unexpected(arg.start);
          --end;
        }
        if (isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
          this.unexpected(last.argument.start);
      }
      for (var i = 0; i < end; i++) {
        var elt = exprList[i];
        if (elt)
          this$1.toAssignable(elt, isBinding);
      }
      return exprList;
    };
    pp$2.parseSpread = function(refDestructuringErrors) {
      var node = this.startNode();
      this.next();
      node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
      return this.finishNode(node, "SpreadElement");
    };
    pp$2.parseRest = function(allowNonIdent) {
      var node = this.startNode();
      this.next();
      if (allowNonIdent)
        node.argument = this.type === tt.name ? this.parseIdent() : this.unexpected();
      else
        node.argument = this.type === tt.name || this.type === tt.bracketL ? this.parseBindingAtom() : this.unexpected();
      return this.finishNode(node, "RestElement");
    };
    pp$2.parseBindingAtom = function() {
      if (this.options.ecmaVersion < 6)
        return this.parseIdent();
      switch (this.type) {
        case tt.name:
          return this.parseIdent();
        case tt.bracketL:
          var node = this.startNode();
          this.next();
          node.elements = this.parseBindingList(tt.bracketR, true, true);
          return this.finishNode(node, "ArrayPattern");
        case tt.braceL:
          return this.parseObj(true);
        default:
          this.unexpected();
      }
    };
    pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma, allowNonIdent) {
      var this$1 = this;
      var elts = [],
          first = true;
      while (!this.eat(close)) {
        if (first)
          first = false;
        else
          this$1.expect(tt.comma);
        if (allowEmpty && this$1.type === tt.comma) {
          elts.push(null);
        } else if (allowTrailingComma && this$1.afterTrailingComma(close)) {
          break;
        } else if (this$1.type === tt.ellipsis) {
          var rest = this$1.parseRest(allowNonIdent);
          this$1.parseBindingListItem(rest);
          elts.push(rest);
          if (this$1.type === tt.comma)
            this$1.raise(this$1.start, "Comma is not permitted after the rest element");
          this$1.expect(close);
          break;
        } else {
          var elem = this$1.parseMaybeDefault(this$1.start, this$1.startLoc);
          this$1.parseBindingListItem(elem);
          elts.push(elem);
        }
      }
      return elts;
    };
    pp$2.parseBindingListItem = function(param) {
      return param;
    };
    pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
      left = left || this.parseBindingAtom();
      if (this.options.ecmaVersion < 6 || !this.eat(tt.eq))
        return left;
      var node = this.startNodeAt(startPos, startLoc);
      node.left = left;
      node.right = this.parseMaybeAssign();
      return this.finishNode(node, "AssignmentPattern");
    };
    pp$2.checkLVal = function(expr, isBinding, checkClashes) {
      var this$1 = this;
      switch (expr.type) {
        case "Identifier":
          if (this.strict && this.reservedWordsStrictBind.test(expr.name))
            this.raiseRecoverable(expr.start, (isBinding ? "Binding " : "Assigning to ") + expr.name + " in strict mode");
          if (checkClashes) {
            if (has(checkClashes, expr.name))
              this.raiseRecoverable(expr.start, "Argument name clash");
            checkClashes[expr.name] = true;
          }
          break;
        case "MemberExpression":
          if (isBinding)
            this.raiseRecoverable(expr.start, (isBinding ? "Binding" : "Assigning to") + " member expression");
          break;
        case "ObjectPattern":
          for (var i = 0; i < expr.properties.length; i++)
            this$1.checkLVal(expr.properties[i].value, isBinding, checkClashes);
          break;
        case "ArrayPattern":
          for (var i$1 = 0; i$1 < expr.elements.length; i$1++) {
            var elem = expr.elements[i$1];
            if (elem)
              this$1.checkLVal(elem, isBinding, checkClashes);
          }
          break;
        case "AssignmentPattern":
          this.checkLVal(expr.left, isBinding, checkClashes);
          break;
        case "RestElement":
          this.checkLVal(expr.argument, isBinding, checkClashes);
          break;
        case "ParenthesizedExpression":
          this.checkLVal(expr.expression, isBinding, checkClashes);
          break;
        default:
          this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " rvalue");
      }
    };
    var pp$3 = Parser.prototype;
    pp$3.checkPropClash = function(prop, propHash) {
      if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
        return;
      var key = prop.key;
      var name;
      switch (key.type) {
        case "Identifier":
          name = key.name;
          break;
        case "Literal":
          name = String(key.value);
          break;
        default:
          return;
      }
      var kind = prop.kind;
      if (this.options.ecmaVersion >= 6) {
        if (name === "__proto__" && kind === "init") {
          if (propHash.proto)
            this.raiseRecoverable(key.start, "Redefinition of __proto__ property");
          propHash.proto = true;
        }
        return;
      }
      name = "$" + name;
      var other = propHash[name];
      if (other) {
        var isGetSet = kind !== "init";
        if ((this.strict || isGetSet) && other[kind] || !(isGetSet ^ other.init))
          this.raiseRecoverable(key.start, "Redefinition of property");
      } else {
        other = propHash[name] = {
          init: false,
          get: false,
          set: false
        };
      }
      other[kind] = true;
    };
    pp$3.parseExpression = function(noIn, refDestructuringErrors) {
      var this$1 = this;
      var startPos = this.start,
          startLoc = this.startLoc;
      var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
      if (this.type === tt.comma) {
        var node = this.startNodeAt(startPos, startLoc);
        node.expressions = [expr];
        while (this.eat(tt.comma))
          node.expressions.push(this$1.parseMaybeAssign(noIn, refDestructuringErrors));
        return this.finishNode(node, "SequenceExpression");
      }
      return expr;
    };
    pp$3.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
      if (this.inGenerator && this.isContextual("yield"))
        return this.parseYield();
      var ownDestructuringErrors = false;
      if (!refDestructuringErrors) {
        refDestructuringErrors = new DestructuringErrors;
        ownDestructuringErrors = true;
      }
      var startPos = this.start,
          startLoc = this.startLoc;
      if (this.type == tt.parenL || this.type == tt.name)
        this.potentialArrowAt = this.start;
      var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
      if (afterLeftParse)
        left = afterLeftParse.call(this, left, startPos, startLoc);
      if (this.type.isAssign) {
        this.checkPatternErrors(refDestructuringErrors, true);
        if (!ownDestructuringErrors)
          DestructuringErrors.call(refDestructuringErrors);
        var node = this.startNodeAt(startPos, startLoc);
        node.operator = this.value;
        node.left = this.type === tt.eq ? this.toAssignable(left) : left;
        refDestructuringErrors.shorthandAssign = 0;
        this.checkLVal(left);
        this.next();
        node.right = this.parseMaybeAssign(noIn);
        return this.finishNode(node, "AssignmentExpression");
      } else {
        if (ownDestructuringErrors)
          this.checkExpressionErrors(refDestructuringErrors, true);
      }
      return left;
    };
    pp$3.parseMaybeConditional = function(noIn, refDestructuringErrors) {
      var startPos = this.start,
          startLoc = this.startLoc;
      var expr = this.parseExprOps(noIn, refDestructuringErrors);
      if (this.checkExpressionErrors(refDestructuringErrors))
        return expr;
      if (this.eat(tt.question)) {
        var node = this.startNodeAt(startPos, startLoc);
        node.test = expr;
        node.consequent = this.parseMaybeAssign();
        this.expect(tt.colon);
        node.alternate = this.parseMaybeAssign(noIn);
        return this.finishNode(node, "ConditionalExpression");
      }
      return expr;
    };
    pp$3.parseExprOps = function(noIn, refDestructuringErrors) {
      var startPos = this.start,
          startLoc = this.startLoc;
      var expr = this.parseMaybeUnary(refDestructuringErrors, false);
      if (this.checkExpressionErrors(refDestructuringErrors))
        return expr;
      return this.parseExprOp(expr, startPos, startLoc, -1, noIn);
    };
    pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
      var prec = this.type.binop;
      if (prec != null && (!noIn || this.type !== tt._in)) {
        if (prec > minPrec) {
          var logical = this.type === tt.logicalOR || this.type === tt.logicalAND;
          var op = this.value;
          this.next();
          var startPos = this.start,
              startLoc = this.startLoc;
          var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, noIn);
          var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical);
          return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn);
        }
      }
      return left;
    };
    pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
      var node = this.startNodeAt(startPos, startLoc);
      node.left = left;
      node.operator = op;
      node.right = right;
      return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression");
    };
    pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary) {
      var this$1 = this;
      var startPos = this.start,
          startLoc = this.startLoc,
          expr;
      if (this.type.prefix) {
        var node = this.startNode(),
            update = this.type === tt.incDec;
        node.operator = this.value;
        node.prefix = true;
        this.next();
        node.argument = this.parseMaybeUnary(null, true);
        this.checkExpressionErrors(refDestructuringErrors, true);
        if (update)
          this.checkLVal(node.argument);
        else if (this.strict && node.operator === "delete" && node.argument.type === "Identifier")
          this.raiseRecoverable(node.start, "Deleting local variable in strict mode");
        else
          sawUnary = true;
        expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
      } else {
        expr = this.parseExprSubscripts(refDestructuringErrors);
        if (this.checkExpressionErrors(refDestructuringErrors))
          return expr;
        while (this.type.postfix && !this.canInsertSemicolon()) {
          var node$1 = this$1.startNodeAt(startPos, startLoc);
          node$1.operator = this$1.value;
          node$1.prefix = false;
          node$1.argument = expr;
          this$1.checkLVal(expr);
          this$1.next();
          expr = this$1.finishNode(node$1, "UpdateExpression");
        }
      }
      if (!sawUnary && this.eat(tt.starstar))
        return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false);
      else
        return expr;
    };
    pp$3.parseExprSubscripts = function(refDestructuringErrors) {
      var startPos = this.start,
          startLoc = this.startLoc;
      var expr = this.parseExprAtom(refDestructuringErrors);
      var skipArrowSubscripts = expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")";
      if (this.checkExpressionErrors(refDestructuringErrors) || skipArrowSubscripts)
        return expr;
      return this.parseSubscripts(expr, startPos, startLoc);
    };
    pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
      var this$1 = this;
      for (; ; ) {
        if (this$1.eat(tt.dot)) {
          var node = this$1.startNodeAt(startPos, startLoc);
          node.object = base;
          node.property = this$1.parseIdent(true);
          node.computed = false;
          base = this$1.finishNode(node, "MemberExpression");
        } else if (this$1.eat(tt.bracketL)) {
          var node$1 = this$1.startNodeAt(startPos, startLoc);
          node$1.object = base;
          node$1.property = this$1.parseExpression();
          node$1.computed = true;
          this$1.expect(tt.bracketR);
          base = this$1.finishNode(node$1, "MemberExpression");
        } else if (!noCalls && this$1.eat(tt.parenL)) {
          var node$2 = this$1.startNodeAt(startPos, startLoc);
          node$2.callee = base;
          node$2.arguments = this$1.parseExprList(tt.parenR, false);
          base = this$1.finishNode(node$2, "CallExpression");
        } else if (this$1.type === tt.backQuote) {
          var node$3 = this$1.startNodeAt(startPos, startLoc);
          node$3.tag = base;
          node$3.quasi = this$1.parseTemplate();
          base = this$1.finishNode(node$3, "TaggedTemplateExpression");
        } else {
          return base;
        }
      }
    };
    pp$3.parseExprAtom = function(refDestructuringErrors) {
      var node,
          canBeArrow = this.potentialArrowAt == this.start;
      switch (this.type) {
        case tt._super:
          if (!this.inFunction)
            this.raise(this.start, "'super' outside of function or class");
        case tt._this:
          var type = this.type === tt._this ? "ThisExpression" : "Super";
          node = this.startNode();
          this.next();
          return this.finishNode(node, type);
        case tt.name:
          var startPos = this.start,
              startLoc = this.startLoc;
          var id = this.parseIdent(this.type !== tt.name);
          if (canBeArrow && !this.canInsertSemicolon() && this.eat(tt.arrow))
            return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id]);
          return id;
        case tt.regexp:
          var value = this.value;
          node = this.parseLiteral(value.value);
          node.regex = {
            pattern: value.pattern,
            flags: value.flags
          };
          return node;
        case tt.num:
        case tt.string:
          return this.parseLiteral(this.value);
        case tt._null:
        case tt._true:
        case tt._false:
          node = this.startNode();
          node.value = this.type === tt._null ? null : this.type === tt._true;
          node.raw = this.type.keyword;
          this.next();
          return this.finishNode(node, "Literal");
        case tt.parenL:
          return this.parseParenAndDistinguishExpression(canBeArrow);
        case tt.bracketL:
          node = this.startNode();
          this.next();
          node.elements = this.parseExprList(tt.bracketR, true, true, refDestructuringErrors);
          return this.finishNode(node, "ArrayExpression");
        case tt.braceL:
          return this.parseObj(false, refDestructuringErrors);
        case tt._function:
          node = this.startNode();
          this.next();
          return this.parseFunction(node, false);
        case tt._class:
          return this.parseClass(this.startNode(), false);
        case tt._new:
          return this.parseNew();
        case tt.backQuote:
          return this.parseTemplate();
        default:
          this.unexpected();
      }
    };
    pp$3.parseLiteral = function(value) {
      var node = this.startNode();
      node.value = value;
      node.raw = this.input.slice(this.start, this.end);
      this.next();
      return this.finishNode(node, "Literal");
    };
    pp$3.parseParenExpression = function() {
      this.expect(tt.parenL);
      var val = this.parseExpression();
      this.expect(tt.parenR);
      return val;
    };
    pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
      var this$1 = this;
      var startPos = this.start,
          startLoc = this.startLoc,
          val;
      if (this.options.ecmaVersion >= 6) {
        this.next();
        var innerStartPos = this.start,
            innerStartLoc = this.startLoc;
        var exprList = [],
            first = true;
        var refDestructuringErrors = new DestructuringErrors,
            spreadStart,
            innerParenStart;
        while (this.type !== tt.parenR) {
          first ? first = false : this$1.expect(tt.comma);
          if (this$1.type === tt.ellipsis) {
            spreadStart = this$1.start;
            exprList.push(this$1.parseParenItem(this$1.parseRest()));
            break;
          } else {
            if (this$1.type === tt.parenL && !innerParenStart) {
              innerParenStart = this$1.start;
            }
            exprList.push(this$1.parseMaybeAssign(false, refDestructuringErrors, this$1.parseParenItem));
          }
        }
        var innerEndPos = this.start,
            innerEndLoc = this.startLoc;
        this.expect(tt.parenR);
        if (canBeArrow && !this.canInsertSemicolon() && this.eat(tt.arrow)) {
          this.checkPatternErrors(refDestructuringErrors, true);
          if (innerParenStart)
            this.unexpected(innerParenStart);
          return this.parseParenArrowList(startPos, startLoc, exprList);
        }
        if (!exprList.length)
          this.unexpected(this.lastTokStart);
        if (spreadStart)
          this.unexpected(spreadStart);
        this.checkExpressionErrors(refDestructuringErrors, true);
        if (exprList.length > 1) {
          val = this.startNodeAt(innerStartPos, innerStartLoc);
          val.expressions = exprList;
          this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
        } else {
          val = exprList[0];
        }
      } else {
        val = this.parseParenExpression();
      }
      if (this.options.preserveParens) {
        var par = this.startNodeAt(startPos, startLoc);
        par.expression = val;
        return this.finishNode(par, "ParenthesizedExpression");
      } else {
        return val;
      }
    };
    pp$3.parseParenItem = function(item) {
      return item;
    };
    pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
      return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList);
    };
    var empty$1 = [];
    pp$3.parseNew = function() {
      var node = this.startNode();
      var meta = this.parseIdent(true);
      if (this.options.ecmaVersion >= 6 && this.eat(tt.dot)) {
        node.meta = meta;
        node.property = this.parseIdent(true);
        if (node.property.name !== "target")
          this.raiseRecoverable(node.property.start, "The only valid meta property for new is new.target");
        if (!this.inFunction)
          this.raiseRecoverable(node.start, "new.target can only be used in functions");
        return this.finishNode(node, "MetaProperty");
      }
      var startPos = this.start,
          startLoc = this.startLoc;
      node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
      if (this.eat(tt.parenL))
        node.arguments = this.parseExprList(tt.parenR, false);
      else
        node.arguments = empty$1;
      return this.finishNode(node, "NewExpression");
    };
    pp$3.parseTemplateElement = function() {
      var elem = this.startNode();
      elem.value = {
        raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, '\n'),
        cooked: this.value
      };
      this.next();
      elem.tail = this.type === tt.backQuote;
      return this.finishNode(elem, "TemplateElement");
    };
    pp$3.parseTemplate = function() {
      var this$1 = this;
      var node = this.startNode();
      this.next();
      node.expressions = [];
      var curElt = this.parseTemplateElement();
      node.quasis = [curElt];
      while (!curElt.tail) {
        this$1.expect(tt.dollarBraceL);
        node.expressions.push(this$1.parseExpression());
        this$1.expect(tt.braceR);
        node.quasis.push(curElt = this$1.parseTemplateElement());
      }
      this.next();
      return this.finishNode(node, "TemplateLiteral");
    };
    pp$3.parseObj = function(isPattern, refDestructuringErrors) {
      var this$1 = this;
      var node = this.startNode(),
          first = true,
          propHash = {};
      node.properties = [];
      this.next();
      while (!this.eat(tt.braceR)) {
        if (!first) {
          this$1.expect(tt.comma);
          if (this$1.afterTrailingComma(tt.braceR))
            break;
        } else
          first = false;
        var prop = this$1.startNode(),
            isGenerator,
            startPos,
            startLoc;
        if (this$1.options.ecmaVersion >= 6) {
          prop.method = false;
          prop.shorthand = false;
          if (isPattern || refDestructuringErrors) {
            startPos = this$1.start;
            startLoc = this$1.startLoc;
          }
          if (!isPattern)
            isGenerator = this$1.eat(tt.star);
        }
        this$1.parsePropertyName(prop);
        this$1.parsePropertyValue(prop, isPattern, isGenerator, startPos, startLoc, refDestructuringErrors);
        this$1.checkPropClash(prop, propHash);
        node.properties.push(this$1.finishNode(prop, "Property"));
      }
      return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
    };
    pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, startPos, startLoc, refDestructuringErrors) {
      if (this.eat(tt.colon)) {
        prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
        prop.kind = "init";
      } else if (this.options.ecmaVersion >= 6 && this.type === tt.parenL) {
        if (isPattern)
          this.unexpected();
        prop.kind = "init";
        prop.method = true;
        prop.value = this.parseMethod(isGenerator);
      } else if (this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && (this.type != tt.comma && this.type != tt.braceR)) {
        if (isGenerator || isPattern)
          this.unexpected();
        prop.kind = prop.key.name;
        this.parsePropertyName(prop);
        prop.value = this.parseMethod(false);
        var paramCount = prop.kind === "get" ? 0 : 1;
        if (prop.value.params.length !== paramCount) {
          var start = prop.value.start;
          if (prop.kind === "get")
            this.raiseRecoverable(start, "getter should have no params");
          else
            this.raiseRecoverable(start, "setter should have exactly one param");
        }
        if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
          this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params");
      } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
        if (this.keywords.test(prop.key.name) || (this.strict ? this.reservedWordsStrictBind : this.reservedWords).test(prop.key.name) || (this.inGenerator && prop.key.name == "yield"))
          this.raiseRecoverable(prop.key.start, "'" + prop.key.name + "' can not be used as shorthand property");
        prop.kind = "init";
        if (isPattern) {
          prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
        } else if (this.type === tt.eq && refDestructuringErrors) {
          if (!refDestructuringErrors.shorthandAssign)
            refDestructuringErrors.shorthandAssign = this.start;
          prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
        } else {
          prop.value = prop.key;
        }
        prop.shorthand = true;
      } else
        this.unexpected();
    };
    pp$3.parsePropertyName = function(prop) {
      if (this.options.ecmaVersion >= 6) {
        if (this.eat(tt.bracketL)) {
          prop.computed = true;
          prop.key = this.parseMaybeAssign();
          this.expect(tt.bracketR);
          return prop.key;
        } else {
          prop.computed = false;
        }
      }
      return prop.key = this.type === tt.num || this.type === tt.string ? this.parseExprAtom() : this.parseIdent(true);
    };
    pp$3.initFunction = function(node) {
      node.id = null;
      if (this.options.ecmaVersion >= 6) {
        node.generator = false;
        node.expression = false;
      }
    };
    pp$3.parseMethod = function(isGenerator) {
      var node = this.startNode(),
          oldInGen = this.inGenerator;
      this.inGenerator = isGenerator;
      this.initFunction(node);
      this.expect(tt.parenL);
      node.params = this.parseBindingList(tt.parenR, false, false);
      if (this.options.ecmaVersion >= 6)
        node.generator = isGenerator;
      this.parseFunctionBody(node, false);
      this.inGenerator = oldInGen;
      return this.finishNode(node, "FunctionExpression");
    };
    pp$3.parseArrowExpression = function(node, params) {
      var oldInGen = this.inGenerator;
      this.inGenerator = false;
      this.initFunction(node);
      node.params = this.toAssignableList(params, true);
      this.parseFunctionBody(node, true);
      this.inGenerator = oldInGen;
      return this.finishNode(node, "ArrowFunctionExpression");
    };
    pp$3.parseFunctionBody = function(node, isArrowFunction) {
      var isExpression = isArrowFunction && this.type !== tt.braceL;
      if (isExpression) {
        node.body = this.parseMaybeAssign();
        node.expression = true;
      } else {
        var oldInFunc = this.inFunction,
            oldLabels = this.labels;
        this.inFunction = true;
        this.labels = [];
        node.body = this.parseBlock(true);
        node.expression = false;
        this.inFunction = oldInFunc;
        this.labels = oldLabels;
      }
      var useStrict = (!isExpression && node.body.body.length && this.isUseStrict(node.body.body[0])) ? node.body.body[0] : null;
      if (this.strict || useStrict) {
        var oldStrict = this.strict;
        this.strict = true;
        if (node.id)
          this.checkLVal(node.id, true);
        this.checkParams(node, useStrict);
        this.strict = oldStrict;
      } else if (isArrowFunction) {
        this.checkParams(node, useStrict);
      }
    };
    pp$3.checkParams = function(node, useStrict) {
      var this$1 = this;
      var nameHash = {};
      for (var i = 0; i < node.params.length; i++) {
        if (useStrict && this$1.options.ecmaVersion >= 7 && node.params[i].type !== "Identifier")
          this$1.raiseRecoverable(useStrict.start, "Illegal 'use strict' directive in function with non-simple parameter list");
        this$1.checkLVal(node.params[i], true, nameHash);
      }
    };
    pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
      var this$1 = this;
      var elts = [],
          first = true;
      while (!this.eat(close)) {
        if (!first) {
          this$1.expect(tt.comma);
          if (allowTrailingComma && this$1.afterTrailingComma(close))
            break;
        } else
          first = false;
        var elt;
        if (allowEmpty && this$1.type === tt.comma)
          elt = null;
        else if (this$1.type === tt.ellipsis) {
          elt = this$1.parseSpread(refDestructuringErrors);
          if (this$1.type === tt.comma && refDestructuringErrors && !refDestructuringErrors.trailingComma) {
            refDestructuringErrors.trailingComma = this$1.lastTokStart;
          }
        } else
          elt = this$1.parseMaybeAssign(false, refDestructuringErrors);
        elts.push(elt);
      }
      return elts;
    };
    pp$3.parseIdent = function(liberal) {
      var node = this.startNode();
      if (liberal && this.options.allowReserved == "never")
        liberal = false;
      if (this.type === tt.name) {
        if (!liberal && (this.strict ? this.reservedWordsStrict : this.reservedWords).test(this.value) && (this.options.ecmaVersion >= 6 || this.input.slice(this.start, this.end).indexOf("\\") == -1))
          this.raiseRecoverable(this.start, "The keyword '" + this.value + "' is reserved");
        if (!liberal && this.inGenerator && this.value === "yield")
          this.raiseRecoverable(this.start, "Can not use 'yield' as identifier inside a generator");
        node.name = this.value;
      } else if (liberal && this.type.keyword) {
        node.name = this.type.keyword;
      } else {
        this.unexpected();
      }
      this.next();
      return this.finishNode(node, "Identifier");
    };
    pp$3.parseYield = function() {
      var node = this.startNode();
      this.next();
      if (this.type == tt.semi || this.canInsertSemicolon() || (this.type != tt.star && !this.type.startsExpr)) {
        node.delegate = false;
        node.argument = null;
      } else {
        node.delegate = this.eat(tt.star);
        node.argument = this.parseMaybeAssign();
      }
      return this.finishNode(node, "YieldExpression");
    };
    var pp$4 = Parser.prototype;
    pp$4.raise = function(pos, message) {
      var loc = getLineInfo(this.input, pos);
      message += " (" + loc.line + ":" + loc.column + ")";
      var err = new SyntaxError(message);
      err.pos = pos;
      err.loc = loc;
      err.raisedAt = this.pos;
      throw err;
    };
    pp$4.raiseRecoverable = pp$4.raise;
    pp$4.curPosition = function() {
      if (this.options.locations) {
        return new Position(this.curLine, this.pos - this.lineStart);
      }
    };
    var Node = function Node(parser, pos, loc) {
      this.type = "";
      this.start = pos;
      this.end = 0;
      if (parser.options.locations)
        this.loc = new SourceLocation(parser, loc);
      if (parser.options.directSourceFile)
        this.sourceFile = parser.options.directSourceFile;
      if (parser.options.ranges)
        this.range = [pos, 0];
    };
    var pp$5 = Parser.prototype;
    pp$5.startNode = function() {
      return new Node(this, this.start, this.startLoc);
    };
    pp$5.startNodeAt = function(pos, loc) {
      return new Node(this, pos, loc);
    };
    function finishNodeAt(node, type, pos, loc) {
      node.type = type;
      node.end = pos;
      if (this.options.locations)
        node.loc.end = loc;
      if (this.options.ranges)
        node.range[1] = pos;
      return node;
    }
    pp$5.finishNode = function(node, type) {
      return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc);
    };
    pp$5.finishNodeAt = function(node, type, pos, loc) {
      return finishNodeAt.call(this, node, type, pos, loc);
    };
    var TokContext = function TokContext(token, isExpr, preserveSpace, override) {
      this.token = token;
      this.isExpr = !!isExpr;
      this.preserveSpace = !!preserveSpace;
      this.override = override;
    };
    var types = {
      b_stat: new TokContext("{", false),
      b_expr: new TokContext("{", true),
      b_tmpl: new TokContext("${", true),
      p_stat: new TokContext("(", false),
      p_expr: new TokContext("(", true),
      q_tmpl: new TokContext("`", true, true, function(p) {
        return p.readTmplToken();
      }),
      f_expr: new TokContext("function", true)
    };
    var pp$6 = Parser.prototype;
    pp$6.initialContext = function() {
      return [types.b_stat];
    };
    pp$6.braceIsBlock = function(prevType) {
      if (prevType === tt.colon) {
        var parent = this.curContext();
        if (parent === types.b_stat || parent === types.b_expr)
          return !parent.isExpr;
      }
      if (prevType === tt._return)
        return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
      if (prevType === tt._else || prevType === tt.semi || prevType === tt.eof || prevType === tt.parenR)
        return true;
      if (prevType == tt.braceL)
        return this.curContext() === types.b_stat;
      return !this.exprAllowed;
    };
    pp$6.updateContext = function(prevType) {
      var update,
          type = this.type;
      if (type.keyword && prevType == tt.dot)
        this.exprAllowed = false;
      else if (update = type.updateContext)
        update.call(this, prevType);
      else
        this.exprAllowed = type.beforeExpr;
    };
    tt.parenR.updateContext = tt.braceR.updateContext = function() {
      if (this.context.length == 1) {
        this.exprAllowed = true;
        return;
      }
      var out = this.context.pop();
      if (out === types.b_stat && this.curContext() === types.f_expr) {
        this.context.pop();
        this.exprAllowed = false;
      } else if (out === types.b_tmpl) {
        this.exprAllowed = true;
      } else {
        this.exprAllowed = !out.isExpr;
      }
    };
    tt.braceL.updateContext = function(prevType) {
      this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
      this.exprAllowed = true;
    };
    tt.dollarBraceL.updateContext = function() {
      this.context.push(types.b_tmpl);
      this.exprAllowed = true;
    };
    tt.parenL.updateContext = function(prevType) {
      var statementParens = prevType === tt._if || prevType === tt._for || prevType === tt._with || prevType === tt._while;
      this.context.push(statementParens ? types.p_stat : types.p_expr);
      this.exprAllowed = true;
    };
    tt.incDec.updateContext = function() {};
    tt._function.updateContext = function(prevType) {
      if (prevType.beforeExpr && prevType !== tt.semi && prevType !== tt._else && !((prevType === tt.colon || prevType === tt.braceL) && this.curContext() === types.b_stat))
        this.context.push(types.f_expr);
      this.exprAllowed = false;
    };
    tt.backQuote.updateContext = function() {
      if (this.curContext() === types.q_tmpl)
        this.context.pop();
      else
        this.context.push(types.q_tmpl);
      this.exprAllowed = false;
    };
    var Token = function Token(p) {
      this.type = p.type;
      this.value = p.value;
      this.start = p.start;
      this.end = p.end;
      if (p.options.locations)
        this.loc = new SourceLocation(p, p.startLoc, p.endLoc);
      if (p.options.ranges)
        this.range = [p.start, p.end];
    };
    var pp$7 = Parser.prototype;
    var isRhino = typeof Packages == "object" && Object.prototype.toString.call(Packages) == "[object JavaPackage]";
    pp$7.next = function() {
      if (this.options.onToken)
        this.options.onToken(new Token(this));
      this.lastTokEnd = this.end;
      this.lastTokStart = this.start;
      this.lastTokEndLoc = this.endLoc;
      this.lastTokStartLoc = this.startLoc;
      this.nextToken();
    };
    pp$7.getToken = function() {
      this.next();
      return new Token(this);
    };
    if (typeof Symbol !== "undefined")
      pp$7[Symbol.iterator] = function() {
        var self = this;
        return {next: function() {
            var token = self.getToken();
            return {
              done: token.type === tt.eof,
              value: token
            };
          }};
      };
    pp$7.setStrict = function(strict) {
      var this$1 = this;
      this.strict = strict;
      if (this.type !== tt.num && this.type !== tt.string)
        return;
      this.pos = this.start;
      if (this.options.locations) {
        while (this.pos < this.lineStart) {
          this$1.lineStart = this$1.input.lastIndexOf("\n", this$1.lineStart - 2) + 1;
          --this$1.curLine;
        }
      }
      this.nextToken();
    };
    pp$7.curContext = function() {
      return this.context[this.context.length - 1];
    };
    pp$7.nextToken = function() {
      var curContext = this.curContext();
      if (!curContext || !curContext.preserveSpace)
        this.skipSpace();
      this.start = this.pos;
      if (this.options.locations)
        this.startLoc = this.curPosition();
      if (this.pos >= this.input.length)
        return this.finishToken(tt.eof);
      if (curContext.override)
        return curContext.override(this);
      else
        this.readToken(this.fullCharCodeAtPos());
    };
    pp$7.readToken = function(code) {
      if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92)
        return this.readWord();
      return this.getTokenFromCode(code);
    };
    pp$7.fullCharCodeAtPos = function() {
      var code = this.input.charCodeAt(this.pos);
      if (code <= 0xd7ff || code >= 0xe000)
        return code;
      var next = this.input.charCodeAt(this.pos + 1);
      return (code << 10) + next - 0x35fdc00;
    };
    pp$7.skipBlockComment = function() {
      var this$1 = this;
      var startLoc = this.options.onComment && this.curPosition();
      var start = this.pos,
          end = this.input.indexOf("*/", this.pos += 2);
      if (end === -1)
        this.raise(this.pos - 2, "Unterminated comment");
      this.pos = end + 2;
      if (this.options.locations) {
        lineBreakG.lastIndex = start;
        var match;
        while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
          ++this$1.curLine;
          this$1.lineStart = match.index + match[0].length;
        }
      }
      if (this.options.onComment)
        this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos, startLoc, this.curPosition());
    };
    pp$7.skipLineComment = function(startSkip) {
      var this$1 = this;
      var start = this.pos;
      var startLoc = this.options.onComment && this.curPosition();
      var ch = this.input.charCodeAt(this.pos += startSkip);
      while (this.pos < this.input.length && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
        ++this$1.pos;
        ch = this$1.input.charCodeAt(this$1.pos);
      }
      if (this.options.onComment)
        this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos, startLoc, this.curPosition());
    };
    pp$7.skipSpace = function() {
      var this$1 = this;
      loop: while (this.pos < this.input.length) {
        var ch = this$1.input.charCodeAt(this$1.pos);
        switch (ch) {
          case 32:
          case 160:
            ++this$1.pos;
            break;
          case 13:
            if (this$1.input.charCodeAt(this$1.pos + 1) === 10) {
              ++this$1.pos;
            }
          case 10:
          case 8232:
          case 8233:
            ++this$1.pos;
            if (this$1.options.locations) {
              ++this$1.curLine;
              this$1.lineStart = this$1.pos;
            }
            break;
          case 47:
            switch (this$1.input.charCodeAt(this$1.pos + 1)) {
              case 42:
                this$1.skipBlockComment();
                break;
              case 47:
                this$1.skipLineComment(2);
                break;
              default:
                break loop;
            }
            break;
          default:
            if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
              ++this$1.pos;
            } else {
              break loop;
            }
        }
      }
    };
    pp$7.finishToken = function(type, val) {
      this.end = this.pos;
      if (this.options.locations)
        this.endLoc = this.curPosition();
      var prevType = this.type;
      this.type = type;
      this.value = val;
      this.updateContext(prevType);
    };
    pp$7.readToken_dot = function() {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next >= 48 && next <= 57)
        return this.readNumber(true);
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
        this.pos += 3;
        return this.finishToken(tt.ellipsis);
      } else {
        ++this.pos;
        return this.finishToken(tt.dot);
      }
    };
    pp$7.readToken_slash = function() {
      var next = this.input.charCodeAt(this.pos + 1);
      if (this.exprAllowed) {
        ++this.pos;
        return this.readRegexp();
      }
      if (next === 61)
        return this.finishOp(tt.assign, 2);
      return this.finishOp(tt.slash, 1);
    };
    pp$7.readToken_mult_modulo_exp = function(code) {
      var next = this.input.charCodeAt(this.pos + 1);
      var size = 1;
      var tokentype = code === 42 ? tt.star : tt.modulo;
      if (this.options.ecmaVersion >= 7 && next === 42) {
        ++size;
        tokentype = tt.starstar;
        next = this.input.charCodeAt(this.pos + 2);
      }
      if (next === 61)
        return this.finishOp(tt.assign, size + 1);
      return this.finishOp(tokentype, size);
    };
    pp$7.readToken_pipe_amp = function(code) {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === code)
        return this.finishOp(code === 124 ? tt.logicalOR : tt.logicalAND, 2);
      if (next === 61)
        return this.finishOp(tt.assign, 2);
      return this.finishOp(code === 124 ? tt.bitwiseOR : tt.bitwiseAND, 1);
    };
    pp$7.readToken_caret = function() {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 61)
        return this.finishOp(tt.assign, 2);
      return this.finishOp(tt.bitwiseXOR, 1);
    };
    pp$7.readToken_plus_min = function(code) {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === code) {
        if (next == 45 && this.input.charCodeAt(this.pos + 2) == 62 && lineBreak.test(this.input.slice(this.lastTokEnd, this.pos))) {
          this.skipLineComment(3);
          this.skipSpace();
          return this.nextToken();
        }
        return this.finishOp(tt.incDec, 2);
      }
      if (next === 61)
        return this.finishOp(tt.assign, 2);
      return this.finishOp(tt.plusMin, 1);
    };
    pp$7.readToken_lt_gt = function(code) {
      var next = this.input.charCodeAt(this.pos + 1);
      var size = 1;
      if (next === code) {
        size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
        if (this.input.charCodeAt(this.pos + size) === 61)
          return this.finishOp(tt.assign, size + 1);
        return this.finishOp(tt.bitShift, size);
      }
      if (next == 33 && code == 60 && this.input.charCodeAt(this.pos + 2) == 45 && this.input.charCodeAt(this.pos + 3) == 45) {
        if (this.inModule)
          this.unexpected();
        this.skipLineComment(4);
        this.skipSpace();
        return this.nextToken();
      }
      if (next === 61)
        size = 2;
      return this.finishOp(tt.relational, size);
    };
    pp$7.readToken_eq_excl = function(code) {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 61)
        return this.finishOp(tt.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
      if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
        this.pos += 2;
        return this.finishToken(tt.arrow);
      }
      return this.finishOp(code === 61 ? tt.eq : tt.prefix, 1);
    };
    pp$7.getTokenFromCode = function(code) {
      switch (code) {
        case 46:
          return this.readToken_dot();
        case 40:
          ++this.pos;
          return this.finishToken(tt.parenL);
        case 41:
          ++this.pos;
          return this.finishToken(tt.parenR);
        case 59:
          ++this.pos;
          return this.finishToken(tt.semi);
        case 44:
          ++this.pos;
          return this.finishToken(tt.comma);
        case 91:
          ++this.pos;
          return this.finishToken(tt.bracketL);
        case 93:
          ++this.pos;
          return this.finishToken(tt.bracketR);
        case 123:
          ++this.pos;
          return this.finishToken(tt.braceL);
        case 125:
          ++this.pos;
          return this.finishToken(tt.braceR);
        case 58:
          ++this.pos;
          return this.finishToken(tt.colon);
        case 63:
          ++this.pos;
          return this.finishToken(tt.question);
        case 96:
          if (this.options.ecmaVersion < 6)
            break;
          ++this.pos;
          return this.finishToken(tt.backQuote);
        case 48:
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === 120 || next === 88)
            return this.readRadixNumber(16);
          if (this.options.ecmaVersion >= 6) {
            if (next === 111 || next === 79)
              return this.readRadixNumber(8);
            if (next === 98 || next === 66)
              return this.readRadixNumber(2);
          }
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          return this.readNumber(false);
        case 34:
        case 39:
          return this.readString(code);
        case 47:
          return this.readToken_slash();
        case 37:
        case 42:
          return this.readToken_mult_modulo_exp(code);
        case 124:
        case 38:
          return this.readToken_pipe_amp(code);
        case 94:
          return this.readToken_caret();
        case 43:
        case 45:
          return this.readToken_plus_min(code);
        case 60:
        case 62:
          return this.readToken_lt_gt(code);
        case 61:
        case 33:
          return this.readToken_eq_excl(code);
        case 126:
          return this.finishOp(tt.prefix, 1);
      }
      this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
    };
    pp$7.finishOp = function(type, size) {
      var str = this.input.slice(this.pos, this.pos + size);
      this.pos += size;
      return this.finishToken(type, str);
    };
    function tryCreateRegexp(src, flags, throwErrorAt, parser) {
      try {
        return new RegExp(src, flags);
      } catch (e) {
        if (throwErrorAt !== undefined) {
          if (e instanceof SyntaxError)
            parser.raise(throwErrorAt, "Error parsing regular expression: " + e.message);
          throw e;
        }
      }
    }
    var regexpUnicodeSupport = !!tryCreateRegexp("\uffff", "u");
    pp$7.readRegexp = function() {
      var this$1 = this;
      var escaped,
          inClass,
          start = this.pos;
      for (; ; ) {
        if (this$1.pos >= this$1.input.length)
          this$1.raise(start, "Unterminated regular expression");
        var ch = this$1.input.charAt(this$1.pos);
        if (lineBreak.test(ch))
          this$1.raise(start, "Unterminated regular expression");
        if (!escaped) {
          if (ch === "[")
            inClass = true;
          else if (ch === "]" && inClass)
            inClass = false;
          else if (ch === "/" && !inClass)
            break;
          escaped = ch === "\\";
        } else
          escaped = false;
        ++this$1.pos;
      }
      var content = this.input.slice(start, this.pos);
      ++this.pos;
      var mods = this.readWord1();
      var tmp = content,
          tmpFlags = "";
      if (mods) {
        var validFlags = /^[gim]*$/;
        if (this.options.ecmaVersion >= 6)
          validFlags = /^[gimuy]*$/;
        if (!validFlags.test(mods))
          this.raise(start, "Invalid regular expression flag");
        if (mods.indexOf("u") >= 0) {
          if (regexpUnicodeSupport) {
            tmpFlags = "u";
          } else {
            tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function(_match, code, offset) {
              code = Number("0x" + code);
              if (code > 0x10FFFF)
                this$1.raise(start + offset + 3, "Code point out of bounds");
              return "x";
            });
            tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
            tmpFlags = tmpFlags.replace("u", "");
          }
        }
      }
      var value = null;
      if (!isRhino) {
        tryCreateRegexp(tmp, tmpFlags, start, this);
        value = tryCreateRegexp(content, mods);
      }
      return this.finishToken(tt.regexp, {
        pattern: content,
        flags: mods,
        value: value
      });
    };
    pp$7.readInt = function(radix, len) {
      var this$1 = this;
      var start = this.pos,
          total = 0;
      for (var i = 0,
          e = len == null ? Infinity : len; i < e; ++i) {
        var code = this$1.input.charCodeAt(this$1.pos),
            val;
        if (code >= 97)
          val = code - 97 + 10;
        else if (code >= 65)
          val = code - 65 + 10;
        else if (code >= 48 && code <= 57)
          val = code - 48;
        else
          val = Infinity;
        if (val >= radix)
          break;
        ++this$1.pos;
        total = total * radix + val;
      }
      if (this.pos === start || len != null && this.pos - start !== len)
        return null;
      return total;
    };
    pp$7.readRadixNumber = function(radix) {
      this.pos += 2;
      var val = this.readInt(radix);
      if (val == null)
        this.raise(this.start + 2, "Expected number in radix " + radix);
      if (isIdentifierStart(this.fullCharCodeAtPos()))
        this.raise(this.pos, "Identifier directly after number");
      return this.finishToken(tt.num, val);
    };
    pp$7.readNumber = function(startsWithDot) {
      var start = this.pos,
          isFloat = false,
          octal = this.input.charCodeAt(this.pos) === 48;
      if (!startsWithDot && this.readInt(10) === null)
        this.raise(start, "Invalid number");
      var next = this.input.charCodeAt(this.pos);
      if (next === 46) {
        ++this.pos;
        this.readInt(10);
        isFloat = true;
        next = this.input.charCodeAt(this.pos);
      }
      if (next === 69 || next === 101) {
        next = this.input.charCodeAt(++this.pos);
        if (next === 43 || next === 45)
          ++this.pos;
        if (this.readInt(10) === null)
          this.raise(start, "Invalid number");
        isFloat = true;
      }
      if (isIdentifierStart(this.fullCharCodeAtPos()))
        this.raise(this.pos, "Identifier directly after number");
      var str = this.input.slice(start, this.pos),
          val;
      if (isFloat)
        val = parseFloat(str);
      else if (!octal || str.length === 1)
        val = parseInt(str, 10);
      else if (/[89]/.test(str) || this.strict)
        this.raise(start, "Invalid number");
      else
        val = parseInt(str, 8);
      return this.finishToken(tt.num, val);
    };
    pp$7.readCodePoint = function() {
      var ch = this.input.charCodeAt(this.pos),
          code;
      if (ch === 123) {
        if (this.options.ecmaVersion < 6)
          this.unexpected();
        var codePos = ++this.pos;
        code = this.readHexChar(this.input.indexOf('}', this.pos) - this.pos);
        ++this.pos;
        if (code > 0x10FFFF)
          this.raise(codePos, "Code point out of bounds");
      } else {
        code = this.readHexChar(4);
      }
      return code;
    };
    function codePointToString(code) {
      if (code <= 0xFFFF)
        return String.fromCharCode(code);
      code -= 0x10000;
      return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00);
    }
    pp$7.readString = function(quote) {
      var this$1 = this;
      var out = "",
          chunkStart = ++this.pos;
      for (; ; ) {
        if (this$1.pos >= this$1.input.length)
          this$1.raise(this$1.start, "Unterminated string constant");
        var ch = this$1.input.charCodeAt(this$1.pos);
        if (ch === quote)
          break;
        if (ch === 92) {
          out += this$1.input.slice(chunkStart, this$1.pos);
          out += this$1.readEscapedChar(false);
          chunkStart = this$1.pos;
        } else {
          if (isNewLine(ch))
            this$1.raise(this$1.start, "Unterminated string constant");
          ++this$1.pos;
        }
      }
      out += this.input.slice(chunkStart, this.pos++);
      return this.finishToken(tt.string, out);
    };
    pp$7.readTmplToken = function() {
      var this$1 = this;
      var out = "",
          chunkStart = this.pos;
      for (; ; ) {
        if (this$1.pos >= this$1.input.length)
          this$1.raise(this$1.start, "Unterminated template");
        var ch = this$1.input.charCodeAt(this$1.pos);
        if (ch === 96 || ch === 36 && this$1.input.charCodeAt(this$1.pos + 1) === 123) {
          if (this$1.pos === this$1.start && this$1.type === tt.template) {
            if (ch === 36) {
              this$1.pos += 2;
              return this$1.finishToken(tt.dollarBraceL);
            } else {
              ++this$1.pos;
              return this$1.finishToken(tt.backQuote);
            }
          }
          out += this$1.input.slice(chunkStart, this$1.pos);
          return this$1.finishToken(tt.template, out);
        }
        if (ch === 92) {
          out += this$1.input.slice(chunkStart, this$1.pos);
          out += this$1.readEscapedChar(true);
          chunkStart = this$1.pos;
        } else if (isNewLine(ch)) {
          out += this$1.input.slice(chunkStart, this$1.pos);
          ++this$1.pos;
          switch (ch) {
            case 13:
              if (this$1.input.charCodeAt(this$1.pos) === 10)
                ++this$1.pos;
            case 10:
              out += "\n";
              break;
            default:
              out += String.fromCharCode(ch);
              break;
          }
          if (this$1.options.locations) {
            ++this$1.curLine;
            this$1.lineStart = this$1.pos;
          }
          chunkStart = this$1.pos;
        } else {
          ++this$1.pos;
        }
      }
    };
    pp$7.readEscapedChar = function(inTemplate) {
      var ch = this.input.charCodeAt(++this.pos);
      ++this.pos;
      switch (ch) {
        case 110:
          return "\n";
        case 114:
          return "\r";
        case 120:
          return String.fromCharCode(this.readHexChar(2));
        case 117:
          return codePointToString(this.readCodePoint());
        case 116:
          return "\t";
        case 98:
          return "\b";
        case 118:
          return "\u000b";
        case 102:
          return "\f";
        case 13:
          if (this.input.charCodeAt(this.pos) === 10)
            ++this.pos;
        case 10:
          if (this.options.locations) {
            this.lineStart = this.pos;
            ++this.curLine;
          }
          return "";
        default:
          if (ch >= 48 && ch <= 55) {
            var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
            var octal = parseInt(octalStr, 8);
            if (octal > 255) {
              octalStr = octalStr.slice(0, -1);
              octal = parseInt(octalStr, 8);
            }
            if (octalStr !== "0" && (this.strict || inTemplate)) {
              this.raise(this.pos - 2, "Octal literal in strict mode");
            }
            this.pos += octalStr.length - 1;
            return String.fromCharCode(octal);
          }
          return String.fromCharCode(ch);
      }
    };
    pp$7.readHexChar = function(len) {
      var codePos = this.pos;
      var n = this.readInt(16, len);
      if (n === null)
        this.raise(codePos, "Bad character escape sequence");
      return n;
    };
    pp$7.readWord1 = function() {
      var this$1 = this;
      this.containsEsc = false;
      var word = "",
          first = true,
          chunkStart = this.pos;
      var astral = this.options.ecmaVersion >= 6;
      while (this.pos < this.input.length) {
        var ch = this$1.fullCharCodeAtPos();
        if (isIdentifierChar(ch, astral)) {
          this$1.pos += ch <= 0xffff ? 1 : 2;
        } else if (ch === 92) {
          this$1.containsEsc = true;
          word += this$1.input.slice(chunkStart, this$1.pos);
          var escStart = this$1.pos;
          if (this$1.input.charCodeAt(++this$1.pos) != 117)
            this$1.raise(this$1.pos, "Expecting Unicode escape sequence \\uXXXX");
          ++this$1.pos;
          var esc = this$1.readCodePoint();
          if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
            this$1.raise(escStart, "Invalid Unicode escape");
          word += codePointToString(esc);
          chunkStart = this$1.pos;
        } else {
          break;
        }
        first = false;
      }
      return word + this.input.slice(chunkStart, this.pos);
    };
    pp$7.readWord = function() {
      var word = this.readWord1();
      var type = tt.name;
      if ((this.options.ecmaVersion >= 6 || !this.containsEsc) && this.keywords.test(word))
        type = keywordTypes[word];
      return this.finishToken(type, word);
    };
    var version = "3.3.0";
    function parse(input, options) {
      return new Parser(options, input).parse();
    }
    function parseExpressionAt(input, pos, options) {
      var p = new Parser(options, input, pos);
      p.nextToken();
      return p.parseExpression();
    }
    function tokenizer(input, options) {
      return new Parser(options, input);
    }
    exports.version = version;
    exports.parse = parse;
    exports.parseExpressionAt = parseExpressionAt;
    exports.tokenizer = tokenizer;
    exports.Parser = Parser;
    exports.plugins = plugins;
    exports.defaultOptions = defaultOptions;
    exports.Position = Position;
    exports.SourceLocation = SourceLocation;
    exports.getLineInfo = getLineInfo;
    exports.Node = Node;
    exports.TokenType = TokenType;
    exports.tokTypes = tt;
    exports.TokContext = TokContext;
    exports.tokContexts = types;
    exports.isIdentifierChar = isIdentifierChar;
    exports.isIdentifierStart = isIdentifierStart;
    exports.Token = Token;
    exports.isNewLine = isNewLine;
    exports.lineBreak = lineBreak;
    exports.lineBreakG = lineBreakG;
    Object.defineProperty(exports, '__esModule', {value: true});
  }));
})(require('process'));
