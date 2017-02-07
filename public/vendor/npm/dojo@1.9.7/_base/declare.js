/* */ 
"format cjs";
(function(process) {
  define(["./kernel", "../has", "./lang"], function(dojo, has, lang) {
    var mix = lang.mixin,
        op = Object.prototype,
        opts = op.toString,
        xtor = new Function,
        counter = 0,
        cname = "constructor";
    function err(msg, cls) {
      throw new Error("declare" + (cls ? " " + cls : "") + ": " + msg);
    }
    function c3mro(bases, className) {
      var result = [],
          roots = [{
            cls: 0,
            refs: []
          }],
          nameMap = {},
          clsCount = 1,
          l = bases.length,
          i = 0,
          j,
          lin,
          base,
          top,
          proto,
          rec,
          name,
          refs;
      for (; i < l; ++i) {
        base = bases[i];
        if (!base) {
          err("mixin #" + i + " is unknown. Did you use dojo.require to pull it in?", className);
        } else if (opts.call(base) != "[object Function]") {
          err("mixin #" + i + " is not a callable constructor.", className);
        }
        lin = base._meta ? base._meta.bases : [base];
        top = 0;
        for (j = lin.length - 1; j >= 0; --j) {
          proto = lin[j].prototype;
          if (!proto.hasOwnProperty("declaredClass")) {
            proto.declaredClass = "uniqName_" + (counter++);
          }
          name = proto.declaredClass;
          if (!nameMap.hasOwnProperty(name)) {
            nameMap[name] = {
              count: 0,
              refs: [],
              cls: lin[j]
            };
            ++clsCount;
          }
          rec = nameMap[name];
          if (top && top !== rec) {
            rec.refs.push(top);
            ++top.count;
          }
          top = rec;
        }
        ++top.count;
        roots[0].refs.push(top);
      }
      while (roots.length) {
        top = roots.pop();
        result.push(top.cls);
        --clsCount;
        while (refs = top.refs, refs.length == 1) {
          top = refs[0];
          if (!top || --top.count) {
            top = 0;
            break;
          }
          result.push(top.cls);
          --clsCount;
        }
        if (top) {
          for (i = 0, l = refs.length; i < l; ++i) {
            top = refs[i];
            if (!--top.count) {
              roots.push(top);
            }
          }
        }
      }
      if (clsCount) {
        err("can't build consistent linearization", className);
      }
      base = bases[0];
      result[0] = base ? base._meta && base === result[result.length - base._meta.bases.length] ? base._meta.bases.length : 1 : 0;
      return result;
    }
    function inherited(args, a, f) {
      var name,
          chains,
          bases,
          caller,
          meta,
          base,
          proto,
          opf,
          pos,
          cache = this._inherited = this._inherited || {};
      if (typeof args == "string") {
        name = args;
        args = a;
        a = f;
      }
      f = 0;
      caller = args.callee;
      name = name || caller.nom;
      if (!name) {
        err("can't deduce a name to call inherited()", this.declaredClass);
      }
      meta = this.constructor._meta;
      bases = meta.bases;
      pos = cache.p;
      if (name != cname) {
        if (cache.c !== caller) {
          pos = 0;
          base = bases[0];
          meta = base._meta;
          if (meta.hidden[name] !== caller) {
            chains = meta.chains;
            if (chains && typeof chains[name] == "string") {
              err("calling chained method with inherited: " + name, this.declaredClass);
            }
            do {
              meta = base._meta;
              proto = base.prototype;
              if (meta && (proto[name] === caller && proto.hasOwnProperty(name) || meta.hidden[name] === caller)) {
                break;
              }
            } while (base = bases[++pos]);
            pos = base ? pos : -1;
          }
        }
        base = bases[++pos];
        if (base) {
          proto = base.prototype;
          if (base._meta && proto.hasOwnProperty(name)) {
            f = proto[name];
          } else {
            opf = op[name];
            do {
              proto = base.prototype;
              f = proto[name];
              if (f && (base._meta ? proto.hasOwnProperty(name) : f !== opf)) {
                break;
              }
            } while (base = bases[++pos]);
          }
        }
        f = base && f || op[name];
      } else {
        if (cache.c !== caller) {
          pos = 0;
          meta = bases[0]._meta;
          if (meta && meta.ctor !== caller) {
            chains = meta.chains;
            if (!chains || chains.constructor !== "manual") {
              err("calling chained constructor with inherited", this.declaredClass);
            }
            while (base = bases[++pos]) {
              meta = base._meta;
              if (meta && meta.ctor === caller) {
                break;
              }
            }
            pos = base ? pos : -1;
          }
        }
        while (base = bases[++pos]) {
          meta = base._meta;
          f = meta ? meta.ctor : base;
          if (f) {
            break;
          }
        }
        f = base && f;
      }
      cache.c = f;
      cache.p = pos;
      if (f) {
        return a === true ? f : f.apply(this, a || args);
      }
    }
    function getInherited(name, args) {
      if (typeof name == "string") {
        return this.__inherited(name, args, true);
      }
      return this.__inherited(name, true);
    }
    function inherited__debug(args, a1, a2) {
      var f = this.getInherited(args, a1);
      if (f) {
        return f.apply(this, a2 || a1 || args);
      }
    }
    var inheritedImpl = dojo.config.isDebug ? inherited__debug : inherited;
    function isInstanceOf(cls) {
      var bases = this.constructor._meta.bases;
      for (var i = 0,
          l = bases.length; i < l; ++i) {
        if (bases[i] === cls) {
          return true;
        }
      }
      return this instanceof cls;
    }
    function mixOwn(target, source) {
      for (var name in source) {
        if (name != cname && source.hasOwnProperty(name)) {
          target[name] = source[name];
        }
      }
      if (has("bug-for-in-skips-shadowed")) {
        for (var extraNames = lang._extraNames,
            i = extraNames.length; i; ) {
          name = extraNames[--i];
          if (name != cname && source.hasOwnProperty(name)) {
            target[name] = source[name];
          }
        }
      }
    }
    function safeMixin(target, source) {
      var name,
          t;
      for (name in source) {
        t = source[name];
        if ((t !== op[name] || !(name in op)) && name != cname) {
          if (opts.call(t) == "[object Function]") {
            t.nom = name;
          }
          target[name] = t;
        }
      }
      if (has("bug-for-in-skips-shadowed")) {
        for (var extraNames = lang._extraNames,
            i = extraNames.length; i; ) {
          name = extraNames[--i];
          t = source[name];
          if ((t !== op[name] || !(name in op)) && name != cname) {
            if (opts.call(t) == "[object Function]") {
              t.nom = name;
            }
            target[name] = t;
          }
        }
      }
      return target;
    }
    function extend(source) {
      declare.safeMixin(this.prototype, source);
      return this;
    }
    function createSubclass(mixins, props) {
      return declare([this].concat(mixins), props || {});
    }
    function chainedConstructor(bases, ctorSpecial) {
      return function() {
        var a = arguments,
            args = a,
            a0 = a[0],
            f,
            i,
            m,
            l = bases.length,
            preArgs;
        if (!(this instanceof a.callee)) {
          return applyNew(a);
        }
        if (ctorSpecial && (a0 && a0.preamble || this.preamble)) {
          preArgs = new Array(bases.length);
          preArgs[0] = a;
          for (i = 0; ; ) {
            a0 = a[0];
            if (a0) {
              f = a0.preamble;
              if (f) {
                a = f.apply(this, a) || a;
              }
            }
            f = bases[i].prototype;
            f = f.hasOwnProperty("preamble") && f.preamble;
            if (f) {
              a = f.apply(this, a) || a;
            }
            if (++i == l) {
              break;
            }
            preArgs[i] = a;
          }
        }
        for (i = l - 1; i >= 0; --i) {
          f = bases[i];
          m = f._meta;
          f = m ? m.ctor : f;
          if (f) {
            f.apply(this, preArgs ? preArgs[i] : a);
          }
        }
        f = this.postscript;
        if (f) {
          f.apply(this, args);
        }
      };
    }
    function singleConstructor(ctor, ctorSpecial) {
      return function() {
        var a = arguments,
            t = a,
            a0 = a[0],
            f;
        if (!(this instanceof a.callee)) {
          return applyNew(a);
        }
        if (ctorSpecial) {
          if (a0) {
            f = a0.preamble;
            if (f) {
              t = f.apply(this, t) || t;
            }
          }
          f = this.preamble;
          if (f) {
            f.apply(this, t);
          }
        }
        if (ctor) {
          ctor.apply(this, a);
        }
        f = this.postscript;
        if (f) {
          f.apply(this, a);
        }
      };
    }
    function simpleConstructor(bases) {
      return function() {
        var a = arguments,
            i = 0,
            f,
            m;
        if (!(this instanceof a.callee)) {
          return applyNew(a);
        }
        for (; f = bases[i]; ++i) {
          m = f._meta;
          f = m ? m.ctor : f;
          if (f) {
            f.apply(this, a);
            break;
          }
        }
        f = this.postscript;
        if (f) {
          f.apply(this, a);
        }
      };
    }
    function chain(name, bases, reversed) {
      return function() {
        var b,
            m,
            f,
            i = 0,
            step = 1;
        if (reversed) {
          i = bases.length - 1;
          step = -1;
        }
        for (; b = bases[i]; i += step) {
          m = b._meta;
          f = (m ? m.hidden : b.prototype)[name];
          if (f) {
            f.apply(this, arguments);
          }
        }
      };
    }
    function forceNew(ctor) {
      xtor.prototype = ctor.prototype;
      var t = new xtor;
      xtor.prototype = null;
      return t;
    }
    function applyNew(args) {
      var ctor = args.callee,
          t = forceNew(ctor);
      ctor.apply(t, args);
      return t;
    }
    function declare(className, superclass, props) {
      if (typeof className != "string") {
        props = superclass;
        superclass = className;
        className = "";
      }
      props = props || {};
      var proto,
          i,
          t,
          ctor,
          name,
          bases,
          chains,
          mixins = 1,
          parents = superclass;
      if (opts.call(superclass) == "[object Array]") {
        bases = c3mro(superclass, className);
        t = bases[0];
        mixins = bases.length - t;
        superclass = bases[mixins];
      } else {
        bases = [0];
        if (superclass) {
          if (opts.call(superclass) == "[object Function]") {
            t = superclass._meta;
            bases = bases.concat(t ? t.bases : superclass);
          } else {
            err("base class is not a callable constructor.", className);
          }
        } else if (superclass !== null) {
          err("unknown base class. Did you use dojo.require to pull it in?", className);
        }
      }
      if (superclass) {
        for (i = mixins - 1; ; --i) {
          proto = forceNew(superclass);
          if (!i) {
            break;
          }
          t = bases[i];
          (t._meta ? mixOwn : mix)(proto, t.prototype);
          ctor = new Function;
          ctor.superclass = superclass;
          ctor.prototype = proto;
          superclass = proto.constructor = ctor;
        }
      } else {
        proto = {};
      }
      declare.safeMixin(proto, props);
      t = props.constructor;
      if (t !== op.constructor) {
        t.nom = cname;
        proto.constructor = t;
      }
      for (i = mixins - 1; i; --i) {
        t = bases[i]._meta;
        if (t && t.chains) {
          chains = mix(chains || {}, t.chains);
        }
      }
      if (proto["-chains-"]) {
        chains = mix(chains || {}, proto["-chains-"]);
      }
      t = !chains || !chains.hasOwnProperty(cname);
      bases[0] = ctor = (chains && chains.constructor === "manual") ? simpleConstructor(bases) : (bases.length == 1 ? singleConstructor(props.constructor, t) : chainedConstructor(bases, t));
      ctor._meta = {
        bases: bases,
        hidden: props,
        chains: chains,
        parents: parents,
        ctor: props.constructor
      };
      ctor.superclass = superclass && superclass.prototype;
      ctor.extend = extend;
      ctor.createSubclass = createSubclass;
      ctor.prototype = proto;
      proto.constructor = ctor;
      proto.getInherited = getInherited;
      proto.isInstanceOf = isInstanceOf;
      proto.inherited = inheritedImpl;
      proto.__inherited = inherited;
      if (className) {
        proto.declaredClass = className;
        lang.setObject(className, ctor);
      }
      if (chains) {
        for (name in chains) {
          if (proto[name] && typeof chains[name] == "string" && name != cname) {
            t = proto[name] = chain(name, bases, chains[name] === "after");
            t.nom = name;
          }
        }
      }
      return ctor;
    }
    dojo.safeMixin = declare.safeMixin = safeMixin;
    dojo.declare = declare;
    return declare;
  });
})(require('process'));
