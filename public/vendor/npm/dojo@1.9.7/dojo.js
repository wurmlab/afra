/* */ 
(function(process) {
  (function(userConfig, defaultConfig) {
    var noop = function() {},
        isEmpty = function(it) {
          for (var p in it) {
            return 0;
          }
          return 1;
        },
        toString = {}.toString,
        isFunction = function(it) {
          return toString.call(it) == "[object Function]";
        },
        isString = function(it) {
          return toString.call(it) == "[object String]";
        },
        isArray = function(it) {
          return toString.call(it) == "[object Array]";
        },
        forEach = function(vector, callback) {
          if (vector) {
            for (var i = 0; i < vector.length; ) {
              callback(vector[i++]);
            }
          }
        },
        mix = function(dest, src) {
          for (var p in src) {
            dest[p] = src[p];
          }
          return dest;
        },
        makeError = function(error, info) {
          return mix(new Error(error), {
            src: "dojoLoader",
            info: info
          });
        },
        uidSeed = 1,
        uid = function() {
          return "_" + uidSeed++;
        },
        req = function(config, dependencies, callback) {
          return contextRequire(config, dependencies, callback, 0, req);
        },
        global = this,
        doc = global.document,
        element = doc && doc.createElement("DiV"),
        has = req.has = function(name) {
          return isFunction(hasCache[name]) ? (hasCache[name] = hasCache[name](global, doc, element)) : hasCache[name];
        },
        hasCache = has.cache = defaultConfig.hasCache;
    has.add = function(name, test, now, force) {
      (hasCache[name] === undefined || force) && (hasCache[name] = test);
      return now && has(name);
    };
    has.add("host-node", userConfig.has && "host-node" in userConfig.has ? userConfig.has["host-node"] : (typeof process == "object" && process.versions && process.versions.node && process.versions.v8));
    if (has("host-node")) {
      require('./_base/configNode').config(defaultConfig);
      defaultConfig.loaderPatch.nodeRequire = require;
    }
    has.add("host-rhino", userConfig.has && "host-rhino" in userConfig.has ? userConfig.has["host-rhino"] : (typeof load == "function" && (typeof Packages == "function" || typeof Packages == "object")));
    if (has("host-rhino")) {
      for (var baseUrl = userConfig.baseUrl || ".",
          arg,
          rhinoArgs = this.arguments,
          i = 0; i < rhinoArgs.length; ) {
        arg = (rhinoArgs[i++] + "").split("=");
        if (arg[0] == "baseUrl") {
          baseUrl = arg[1];
          break;
        }
      }
      load(baseUrl + "/_base/configRhino.js");
      rhinoDojoConfig(defaultConfig, baseUrl, rhinoArgs);
    }
    for (var p in userConfig.has) {
      has.add(p, userConfig.has[p], 0, 1);
    }
    var requested = 1,
        arrived = 2,
        nonmodule = 3,
        executing = 4,
        executed = 5;
    if (has("dojo-trace-api")) {
      requested = "requested";
      arrived = "arrived";
      nonmodule = "not-a-module";
      executing = "executing";
      executed = "executed";
    }
    var legacyMode = 0,
        sync = "sync",
        xd = "xd",
        syncExecStack = [],
        dojoRequirePlugin = 0,
        checkDojoRequirePlugin = noop,
        transformToAmd = noop,
        getXhr;
    if (has("dojo-sync-loader")) {
      req.isXdUrl = noop;
      req.initSyncLoader = function(dojoRequirePlugin_, checkDojoRequirePlugin_, transformToAmd_) {
        if (!dojoRequirePlugin) {
          dojoRequirePlugin = dojoRequirePlugin_;
          checkDojoRequirePlugin = checkDojoRequirePlugin_;
          transformToAmd = transformToAmd_;
        }
        return {
          sync: sync,
          requested: requested,
          arrived: arrived,
          nonmodule: nonmodule,
          executing: executing,
          executed: executed,
          syncExecStack: syncExecStack,
          modules: modules,
          execQ: execQ,
          getModule: getModule,
          injectModule: injectModule,
          setArrived: setArrived,
          signal: signal,
          finishExec: finishExec,
          execModule: execModule,
          dojoRequirePlugin: dojoRequirePlugin,
          getLegacyMode: function() {
            return legacyMode;
          },
          guardCheckComplete: guardCheckComplete
        };
      };
      if (has("dom")) {
        var locationProtocol = location.protocol,
            locationHost = location.host;
        req.isXdUrl = function(url) {
          if (/^\./.test(url)) {
            return false;
          }
          if (/^\/\//.test(url)) {
            return true;
          }
          var match = url.match(/^([^\/\:]+\:)\/+([^\/]+)/);
          return match && (match[1] != locationProtocol || (locationHost && match[2] != locationHost));
        };
        has.add("dojo-xhr-factory", 1);
        has.add("dojo-force-activex-xhr", has("host-browser") && !doc.addEventListener && window.location.protocol == "file:");
        has.add("native-xhr", typeof XMLHttpRequest != "undefined");
        if (has("native-xhr") && !has("dojo-force-activex-xhr")) {
          getXhr = function() {
            return new XMLHttpRequest();
          };
        } else {
          for (var XMLHTTP_PROGIDS = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
              progid,
              i = 0; i < 3; ) {
            try {
              progid = XMLHTTP_PROGIDS[i++];
              if (new ActiveXObject(progid)) {
                break;
              }
            } catch (e) {}
          }
          getXhr = function() {
            return new ActiveXObject(progid);
          };
        }
        req.getXhr = getXhr;
        has.add("dojo-gettext-api", 1);
        req.getText = function(url, async, onLoad) {
          var xhr = getXhr();
          xhr.open('GET', fixupUrl(url), false);
          xhr.send(null);
          if (xhr.status == 200 || (!location.host && !xhr.status)) {
            if (onLoad) {
              onLoad(xhr.responseText, async);
            }
          } else {
            throw makeError("xhrFailed", xhr.status);
          }
          return xhr.responseText;
        };
      }
    } else {
      req.async = 1;
    }
    var eval_ = new Function('return eval(arguments[0]);');
    req.eval = function(text, hint) {
      return eval_(text + "\r\n//# sourceURL=" + hint);
    };
    var listenerQueues = {},
        error = "error",
        signal = req.signal = function(type, args) {
          var queue = listenerQueues[type];
          forEach(queue && queue.slice(0), function(listener) {
            listener.apply(null, isArray(args) ? args : [args]);
          });
        },
        on = req.on = function(type, listener) {
          var queue = listenerQueues[type] || (listenerQueues[type] = []);
          queue.push(listener);
          return {remove: function() {
              for (var i = 0; i < queue.length; i++) {
                if (queue[i] === listener) {
                  queue.splice(i, 1);
                  return;
                }
              }
            }};
        };
    var aliases = [],
        paths = {},
        pathsMapProg = [],
        packs = {},
        map = req.map = {},
        mapProgs = [],
        modules = {},
        cacheBust = "",
        cache = {},
        urlKeyPrefix = "url:",
        pendingCacheInsert = {},
        dojoSniffConfig = {},
        insertPointSibling = 0;
    if (has("dojo-config-api")) {
      var consumePendingCacheInsert = function(referenceModule) {
        var p,
            item,
            match,
            now,
            m;
        for (p in pendingCacheInsert) {
          item = pendingCacheInsert[p];
          match = p.match(/^url\:(.+)/);
          if (match) {
            cache[urlKeyPrefix + toUrl(match[1], referenceModule)] = item;
          } else if (p == "*now") {
            now = item;
          } else if (p != "*noref") {
            m = getModuleInfo(p, referenceModule, true);
            cache[m.mid] = cache[urlKeyPrefix + m.url] = item;
          }
        }
        if (now) {
          now(createRequire(referenceModule));
        }
        pendingCacheInsert = {};
      },
          escapeString = function(s) {
            return s.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, function(c) {
              return "\\" + c;
            });
          },
          computeMapProg = function(map, dest) {
            dest.splice(0, dest.length);
            for (var p in map) {
              dest.push([p, map[p], new RegExp("^" + escapeString(p) + "(\/|$)"), p.length]);
            }
            dest.sort(function(lhs, rhs) {
              return rhs[3] - lhs[3];
            });
            return dest;
          },
          computeAliases = function(config, dest) {
            forEach(config, function(pair) {
              dest.push([isString(pair[0]) ? new RegExp("^" + escapeString(pair[0]) + "$") : pair[0], pair[1]]);
            });
          },
          fixupPackageInfo = function(packageInfo) {
            var name = packageInfo.name;
            if (!name) {
              name = packageInfo;
              packageInfo = {name: name};
            }
            packageInfo = mix({main: "main"}, packageInfo);
            packageInfo.location = packageInfo.location ? packageInfo.location : name;
            if (packageInfo.packageMap) {
              map[name] = packageInfo.packageMap;
            }
            if (!packageInfo.main.indexOf("./")) {
              packageInfo.main = packageInfo.main.substring(2);
            }
            packs[name] = packageInfo;
          },
          delayedModuleConfig = [],
          config = function(config, booting, referenceModule) {
            for (var p in config) {
              if (p == "waitSeconds") {
                req.waitms = (config[p] || 0) * 1000;
              }
              if (p == "cacheBust") {
                cacheBust = config[p] ? (isString(config[p]) ? config[p] : (new Date()).getTime() + "") : "";
              }
              if (p == "baseUrl" || p == "combo") {
                req[p] = config[p];
              }
              if (has("dojo-sync-loader") && p == "async") {
                var mode = config[p];
                req.legacyMode = legacyMode = (isString(mode) && /sync|legacyAsync/.test(mode) ? mode : (!mode ? sync : false));
                req.async = !legacyMode;
              }
              if (config[p] !== hasCache) {
                req.rawConfig[p] = config[p];
                p != "has" && has.add("config-" + p, config[p], 0, booting);
              }
            }
            if (!req.baseUrl) {
              req.baseUrl = "./";
            }
            if (!/\/$/.test(req.baseUrl)) {
              req.baseUrl += "/";
            }
            for (p in config.has) {
              has.add(p, config.has[p], 0, booting);
            }
            forEach(config.packages, fixupPackageInfo);
            for (var baseUrl in config.packagePaths) {
              forEach(config.packagePaths[baseUrl], function(packageInfo) {
                var location = baseUrl + "/" + packageInfo;
                if (isString(packageInfo)) {
                  packageInfo = {name: packageInfo};
                }
                packageInfo.location = location;
                fixupPackageInfo(packageInfo);
              });
            }
            computeMapProg(mix(map, config.map), mapProgs);
            forEach(mapProgs, function(item) {
              item[1] = computeMapProg(item[1], []);
              if (item[0] == "*") {
                mapProgs.star = item;
              }
            });
            computeMapProg(mix(paths, config.paths), pathsMapProg);
            computeAliases(config.aliases, aliases);
            if (booting) {
              delayedModuleConfig.push({config: config.config});
            } else {
              for (p in config.config) {
                var module = getModule(p, referenceModule);
                module.config = mix(module.config || {}, config.config[p]);
              }
            }
            if (config.cache) {
              consumePendingCacheInsert();
              pendingCacheInsert = config.cache;
              if (config.cache["*noref"]) {
                consumePendingCacheInsert();
              }
            }
            signal("config", [config, req.rawConfig]);
          };
      if (has("dojo-cdn") || has("dojo-sniff")) {
        var scripts = doc.getElementsByTagName("script"),
            i = 0,
            script,
            dojoDir,
            src,
            match;
        while (i < scripts.length) {
          script = scripts[i++];
          if ((src = script.getAttribute("src")) && (match = src.match(/(((.*)\/)|^)dojo\.js(\W|$)/i))) {
            dojoDir = match[3] || "";
            defaultConfig.baseUrl = defaultConfig.baseUrl || dojoDir;
            insertPointSibling = script;
          }
          if ((src = (script.getAttribute("data-dojo-config") || script.getAttribute("djConfig")))) {
            dojoSniffConfig = req.eval("({ " + src + " })", "data-dojo-config");
            insertPointSibling = script;
          }
          if (has("dojo-requirejs-api")) {
            if ((src = script.getAttribute("data-main"))) {
              dojoSniffConfig.deps = dojoSniffConfig.deps || [src];
            }
          }
        }
      }
      if (has("dojo-test-sniff")) {
        try {
          if (window.parent != window && window.parent.require) {
            var doh = window.parent.require("doh");
            doh && mix(dojoSniffConfig, doh.testConfig);
          }
        } catch (e) {}
      }
      req.rawConfig = {};
      config(defaultConfig, 1);
      if (has("dojo-cdn")) {
        packs.dojo.location = dojoDir;
        if (dojoDir) {
          dojoDir += "/";
        }
        packs.dijit.location = dojoDir + "../dijit/";
        packs.dojox.location = dojoDir + "../dojox/";
      }
      config(userConfig, 1);
      config(dojoSniffConfig, 1);
    } else {
      paths = defaultConfig.paths;
      pathsMapProg = defaultConfig.pathsMapProg;
      packs = defaultConfig.packs;
      aliases = defaultConfig.aliases;
      mapProgs = defaultConfig.mapProgs;
      modules = defaultConfig.modules;
      cache = defaultConfig.cache;
      cacheBust = defaultConfig.cacheBust;
      req.rawConfig = defaultConfig;
    }
    if (has("dojo-combo-api")) {
      req.combo = req.combo || {add: noop};
      var comboPending = 0,
          combosPending = [],
          comboPendingTimer = null;
    }
    var injectDependencies = function(module) {
      guardCheckComplete(function() {
        forEach(module.deps, injectModule);
        if (has("dojo-combo-api") && comboPending && !comboPendingTimer) {
          comboPendingTimer = setTimeout(function() {
            comboPending = 0;
            comboPendingTimer = null;
            req.combo.done(function(mids, url) {
              var onLoadCallback = function() {
                runDefQ(0, mids);
                checkComplete();
              };
              combosPending.push(mids);
              injectingModule = mids;
              req.injectUrl(url, onLoadCallback, mids);
              injectingModule = 0;
            }, req);
          }, 0);
        }
      });
    },
        contextRequire = function(a1, a2, a3, referenceModule, contextRequire) {
          var module,
              syntheticMid;
          if (isString(a1)) {
            module = getModule(a1, referenceModule, true);
            if (module && module.executed) {
              return module.result;
            }
            throw makeError("undefinedModule", a1);
          }
          if (!isArray(a1)) {
            config(a1, 0, referenceModule);
            a1 = a2;
            a2 = a3;
          }
          if (isArray(a1)) {
            if (!a1.length) {
              a2 && a2();
            } else {
              syntheticMid = "require*" + uid();
              for (var mid,
                  deps = [],
                  i = 0; i < a1.length; ) {
                mid = a1[i++];
                deps.push(getModule(mid, referenceModule));
              }
              module = mix(makeModuleInfo("", syntheticMid, 0, ""), {
                injected: arrived,
                deps: deps,
                def: a2 || noop,
                require: referenceModule ? referenceModule.require : req,
                gc: 1
              });
              modules[module.mid] = module;
              injectDependencies(module);
              var strict = checkCompleteGuard && legacyMode != sync;
              guardCheckComplete(function() {
                execModule(module, strict);
              });
              if (!module.executed) {
                execQ.push(module);
              }
              checkComplete();
            }
          }
          return contextRequire;
        },
        createRequire = function(module) {
          if (!module) {
            return req;
          }
          var result = module.require;
          if (!result) {
            result = function(a1, a2, a3) {
              return contextRequire(a1, a2, a3, module, result);
            };
            module.require = mix(result, req);
            result.module = module;
            result.toUrl = function(name) {
              return toUrl(name, module);
            };
            result.toAbsMid = function(mid) {
              return toAbsMid(mid, module);
            };
            if (has("dojo-undef-api")) {
              result.undef = function(mid) {
                req.undef(mid, module);
              };
            }
            if (has("dojo-sync-loader")) {
              result.syncLoadNls = function(mid) {
                var nlsModuleInfo = getModuleInfo(mid, module),
                    nlsModule = modules[nlsModuleInfo.mid];
                if (!nlsModule || !nlsModule.executed) {
                  cached = cache[nlsModuleInfo.mid] || cache[urlKeyPrefix + nlsModuleInfo.url];
                  if (cached) {
                    evalModuleText(cached);
                    nlsModule = modules[nlsModuleInfo.mid];
                  }
                }
                return nlsModule && nlsModule.executed && nlsModule.result;
              };
            }
          }
          return result;
        },
        execQ = [],
        defQ = [],
        waiting = {},
        setRequested = function(module) {
          module.injected = requested;
          waiting[module.mid] = 1;
          if (module.url) {
            waiting[module.url] = module.pack || 1;
          }
          startTimer();
        },
        setArrived = function(module) {
          module.injected = arrived;
          delete waiting[module.mid];
          if (module.url) {
            delete waiting[module.url];
          }
          if (isEmpty(waiting)) {
            clearTimer();
            has("dojo-sync-loader") && legacyMode == xd && (legacyMode = sync);
          }
        },
        execComplete = req.idle = function() {
          return !defQ.length && isEmpty(waiting) && !execQ.length && !checkCompleteGuard;
        },
        runMapProg = function(targetMid, map) {
          if (map) {
            for (var i = 0; i < map.length; i++) {
              if (map[i][2].test(targetMid)) {
                return map[i];
              }
            }
          }
          return 0;
        },
        compactPath = function(path) {
          var result = [],
              segment,
              lastSegment;
          path = path.replace(/\\/g, '/').split('/');
          while (path.length) {
            segment = path.shift();
            if (segment == ".." && result.length && lastSegment != "..") {
              result.pop();
              lastSegment = result[result.length - 1];
            } else if (segment != ".") {
              result.push(lastSegment = segment);
            }
          }
          return result.join("/");
        },
        makeModuleInfo = function(pid, mid, pack, url) {
          if (has("dojo-sync-loader")) {
            var xd = req.isXdUrl(url);
            return {
              pid: pid,
              mid: mid,
              pack: pack,
              url: url,
              executed: 0,
              def: 0,
              isXd: xd,
              isAmd: !!(xd || (packs[pid] && packs[pid].isAmd))
            };
          } else {
            return {
              pid: pid,
              mid: mid,
              pack: pack,
              url: url,
              executed: 0,
              def: 0
            };
          }
        },
        getModuleInfo_ = function(mid, referenceModule, packs, modules, baseUrl, mapProgs, pathsMapProg, aliases, alwaysCreate) {
          var pid,
              pack,
              midInPackage,
              mapItem,
              url,
              result,
              isRelative,
              requestedMid;
          requestedMid = mid;
          isRelative = /^\./.test(mid);
          if (/(^\/)|(\:)|(\.js$)/.test(mid) || (isRelative && !referenceModule)) {
            return makeModuleInfo(0, mid, 0, mid);
          } else {
            mid = compactPath(isRelative ? (referenceModule.mid + "/../" + mid) : mid);
            if (/^\./.test(mid)) {
              throw makeError("irrationalPath", mid);
            }
            if (referenceModule) {
              mapItem = runMapProg(referenceModule.mid, mapProgs);
            }
            mapItem = mapItem || mapProgs.star;
            mapItem = mapItem && runMapProg(mid, mapItem[1]);
            if (mapItem) {
              mid = mapItem[1] + mid.substring(mapItem[3]);
            }
            match = mid.match(/^([^\/]+)(\/(.+))?$/);
            pid = match ? match[1] : "";
            if ((pack = packs[pid])) {
              mid = pid + "/" + (midInPackage = (match[3] || pack.main));
            } else {
              pid = "";
            }
            var candidateLength = 0,
                candidate = 0;
            forEach(aliases, function(pair) {
              var match = mid.match(pair[0]);
              if (match && match.length > candidateLength) {
                candidate = isFunction(pair[1]) ? mid.replace(pair[0], pair[1]) : pair[1];
              }
            });
            if (candidate) {
              return getModuleInfo_(candidate, 0, packs, modules, baseUrl, mapProgs, pathsMapProg, aliases, alwaysCreate);
            }
            result = modules[mid];
            if (result) {
              return alwaysCreate ? makeModuleInfo(result.pid, result.mid, result.pack, result.url) : modules[mid];
            }
          }
          mapItem = runMapProg(mid, pathsMapProg);
          if (mapItem) {
            url = mapItem[1] + mid.substring(mapItem[3]);
          } else if (pid) {
            url = pack.location + "/" + midInPackage;
          } else if (has("config-tlmSiblingOfDojo")) {
            url = "../" + mid;
          } else {
            url = mid;
          }
          if (!(/(^\/)|(\:)/.test(url))) {
            url = baseUrl + url;
          }
          url += ".js";
          return makeModuleInfo(pid, mid, pack, compactPath(url));
        },
        getModuleInfo = function(mid, referenceModule, fromPendingCache) {
          return getModuleInfo_(mid, referenceModule, packs, modules, req.baseUrl, fromPendingCache ? [] : mapProgs, fromPendingCache ? [] : pathsMapProg, fromPendingCache ? [] : aliases);
        },
        resolvePluginResourceId = function(plugin, prid, referenceModule) {
          return plugin.normalize ? plugin.normalize(prid, function(mid) {
            return toAbsMid(mid, referenceModule);
          }) : toAbsMid(prid, referenceModule);
        },
        dynamicPluginUidGenerator = 0,
        getModule = function(mid, referenceModule, immediate) {
          var match,
              plugin,
              prid,
              result;
          match = mid.match(/^(.+?)\!(.*)$/);
          if (match) {
            plugin = getModule(match[1], referenceModule, immediate);
            if (has("dojo-sync-loader") && legacyMode == sync && !plugin.executed) {
              injectModule(plugin);
              if (plugin.injected === arrived && !plugin.executed) {
                guardCheckComplete(function() {
                  execModule(plugin);
                });
              }
              if (plugin.executed) {
                promoteModuleToPlugin(plugin);
              } else {
                execQ.unshift(plugin);
              }
            }
            if (plugin.executed === executed && !plugin.load) {
              promoteModuleToPlugin(plugin);
            }
            if (plugin.load) {
              prid = resolvePluginResourceId(plugin, match[2], referenceModule);
              mid = (plugin.mid + "!" + (plugin.dynamic ? ++dynamicPluginUidGenerator + "!" : "") + prid);
            } else {
              prid = match[2];
              mid = plugin.mid + "!" + (++dynamicPluginUidGenerator) + "!waitingForPlugin";
            }
            result = {
              plugin: plugin,
              mid: mid,
              req: createRequire(referenceModule),
              prid: prid
            };
          } else {
            result = getModuleInfo(mid, referenceModule);
          }
          return modules[result.mid] || (!immediate && (modules[result.mid] = result));
        },
        toAbsMid = req.toAbsMid = function(mid, referenceModule) {
          return getModuleInfo(mid, referenceModule).mid;
        },
        toUrl = req.toUrl = function(name, referenceModule) {
          var moduleInfo = getModuleInfo(name + "/x", referenceModule),
              url = moduleInfo.url;
          return fixupUrl(moduleInfo.pid === 0 ? name : url.substring(0, url.length - 5));
        },
        nonModuleProps = {
          injected: arrived,
          executed: executed,
          def: nonmodule,
          result: nonmodule
        },
        makeCjs = function(mid) {
          return modules[mid] = mix({mid: mid}, nonModuleProps);
        },
        cjsRequireModule = makeCjs("require"),
        cjsExportsModule = makeCjs("exports"),
        cjsModuleModule = makeCjs("module"),
        runFactory = function(module, args) {
          req.trace("loader-run-factory", [module.mid]);
          var factory = module.def,
              result;
          has("dojo-sync-loader") && syncExecStack.unshift(module);
          if (has("config-dojo-loader-catches")) {
            try {
              result = isFunction(factory) ? factory.apply(null, args) : factory;
            } catch (e) {
              signal(error, module.result = makeError("factoryThrew", [module, e]));
            }
          } else {
            result = isFunction(factory) ? factory.apply(null, args) : factory;
          }
          module.result = result === undefined && module.cjs ? module.cjs.exports : result;
          has("dojo-sync-loader") && syncExecStack.shift(module);
        },
        abortExec = {},
        defOrder = 0,
        promoteModuleToPlugin = function(pluginModule) {
          var plugin = pluginModule.result;
          pluginModule.dynamic = plugin.dynamic;
          pluginModule.normalize = plugin.normalize;
          pluginModule.load = plugin.load;
          return pluginModule;
        },
        resolvePluginLoadQ = function(plugin) {
          var map = {};
          forEach(plugin.loadQ, function(pseudoPluginResource) {
            var prid = resolvePluginResourceId(plugin, pseudoPluginResource.prid, pseudoPluginResource.req.module),
                mid = plugin.dynamic ? pseudoPluginResource.mid.replace(/waitingForPlugin$/, prid) : (plugin.mid + "!" + prid),
                pluginResource = mix(mix({}, pseudoPluginResource), {
                  mid: mid,
                  prid: prid,
                  injected: 0
                });
            if (!modules[mid]) {
              injectPlugin(modules[mid] = pluginResource);
            }
            map[pseudoPluginResource.mid] = modules[mid];
            setArrived(pseudoPluginResource);
            delete modules[pseudoPluginResource.mid];
          });
          plugin.loadQ = 0;
          var substituteModules = function(module) {
            for (var replacement,
                deps = module.deps || [],
                i = 0; i < deps.length; i++) {
              replacement = map[deps[i].mid];
              if (replacement) {
                deps[i] = replacement;
              }
            }
          };
          for (var p in modules) {
            substituteModules(modules[p]);
          }
          forEach(execQ, substituteModules);
        },
        finishExec = function(module) {
          req.trace("loader-finish-exec", [module.mid]);
          module.executed = executed;
          module.defOrder = defOrder++;
          has("dojo-sync-loader") && forEach(module.provides, function(cb) {
            cb();
          });
          if (module.loadQ) {
            promoteModuleToPlugin(module);
            resolvePluginLoadQ(module);
          }
          for (i = 0; i < execQ.length; ) {
            if (execQ[i] === module) {
              execQ.splice(i, 1);
            } else {
              i++;
            }
          }
          if (/^require\*/.test(module.mid)) {
            delete modules[module.mid];
          }
        },
        circleTrace = [],
        execModule = function(module, strict) {
          if (module.executed === executing) {
            req.trace("loader-circular-dependency", [circleTrace.concat(module.mid).join("->")]);
            return (!module.def || strict) ? abortExec : (module.cjs && module.cjs.exports);
          }
          if (!module.executed) {
            if (!module.def) {
              return abortExec;
            }
            var mid = module.mid,
                deps = module.deps || [],
                arg,
                argResult,
                args = [],
                i = 0;
            if (has("dojo-trace-api")) {
              circleTrace.push(mid);
              req.trace("loader-exec-module", ["exec", circleTrace.length, mid]);
            }
            module.executed = executing;
            while ((arg = deps[i++])) {
              argResult = ((arg === cjsRequireModule) ? createRequire(module) : ((arg === cjsExportsModule) ? module.cjs.exports : ((arg === cjsModuleModule) ? module.cjs : execModule(arg, strict))));
              if (argResult === abortExec) {
                module.executed = 0;
                req.trace("loader-exec-module", ["abort", mid]);
                has("dojo-trace-api") && circleTrace.pop();
                return abortExec;
              }
              args.push(argResult);
            }
            runFactory(module, args);
            finishExec(module);
            has("dojo-trace-api") && circleTrace.pop();
          }
          return module.result;
        },
        checkCompleteGuard = 0,
        guardCheckComplete = function(proc) {
          try {
            checkCompleteGuard++;
            proc();
          } finally {
            checkCompleteGuard--;
          }
          if (execComplete()) {
            signal("idle", []);
          }
        },
        checkComplete = function() {
          if (checkCompleteGuard) {
            return;
          }
          guardCheckComplete(function() {
            checkDojoRequirePlugin();
            for (var currentDefOrder,
                module,
                i = 0; i < execQ.length; ) {
              currentDefOrder = defOrder;
              module = execQ[i];
              execModule(module);
              if (currentDefOrder != defOrder) {
                checkDojoRequirePlugin();
                i = 0;
              } else {
                i++;
              }
            }
          });
        };
    if (has("dojo-undef-api")) {
      req.undef = function(moduleId, referenceModule) {
        var module = getModule(moduleId, referenceModule);
        setArrived(module);
        mix(module, {
          def: 0,
          executed: 0,
          injected: 0,
          node: 0
        });
      };
    }
    if (has("dojo-inject-api")) {
      if (has("dojo-loader-eval-hint-url") === undefined) {
        has.add("dojo-loader-eval-hint-url", 1);
      }
      var fixupUrl = function(url) {
        url += "";
        return url + (cacheBust ? ((/\?/.test(url) ? "&" : "?") + cacheBust) : "");
      },
          injectPlugin = function(module) {
            var plugin = module.plugin;
            if (plugin.executed === executed && !plugin.load) {
              promoteModuleToPlugin(plugin);
            }
            var onLoad = function(def) {
              module.result = def;
              setArrived(module);
              finishExec(module);
              checkComplete();
            };
            if (plugin.load) {
              plugin.load(module.prid, module.req, onLoad);
            } else if (plugin.loadQ) {
              plugin.loadQ.push(module);
            } else {
              plugin.loadQ = [module];
              execQ.unshift(plugin);
              injectModule(plugin);
            }
          },
          cached = 0,
          injectingModule = 0,
          injectingCachedModule = 0,
          evalModuleText = function(text, module) {
            if (has("config-stripStrict")) {
              text = text.replace(/"use strict"/g, '');
            }
            injectingCachedModule = 1;
            if (has("config-dojo-loader-catches")) {
              try {
                if (text === cached) {
                  cached.call(null);
                } else {
                  req.eval(text, has("dojo-loader-eval-hint-url") ? module.url : module.mid);
                }
              } catch (e) {
                signal(error, makeError("evalModuleThrew", module));
              }
            } else {
              if (text === cached) {
                cached.call(null);
              } else {
                req.eval(text, has("dojo-loader-eval-hint-url") ? module.url : module.mid);
              }
            }
            injectingCachedModule = 0;
          },
          injectModule = function(module) {
            var mid = module.mid,
                url = module.url;
            if (module.executed || module.injected || waiting[mid] || (module.url && ((module.pack && waiting[module.url] === module.pack) || waiting[module.url] == 1))) {
              return;
            }
            setRequested(module);
            if (has("dojo-combo-api")) {
              var viaCombo = 0;
              if (module.plugin && module.plugin.isCombo) {
                req.combo.add(module.plugin.mid, module.prid, 0, req);
                viaCombo = 1;
              } else if (!module.plugin) {
                viaCombo = req.combo.add(0, module.mid, module.url, req);
              }
              if (viaCombo) {
                comboPending = 1;
                return;
              }
            }
            if (module.plugin) {
              injectPlugin(module);
              return;
            }
            var onLoadCallback = function() {
              runDefQ(module);
              if (module.injected !== arrived) {
                if (has("dojo-enforceDefine")) {
                  signal(error, makeError("noDefine", module));
                  return;
                }
                setArrived(module);
                mix(module, nonModuleProps);
                req.trace("loader-define-nonmodule", [module.url]);
              }
              if (has("dojo-sync-loader") && legacyMode) {
                !syncExecStack.length && checkComplete();
              } else {
                checkComplete();
              }
            };
            cached = cache[mid] || cache[urlKeyPrefix + module.url];
            if (cached) {
              req.trace("loader-inject", ["cache", module.mid, url]);
              evalModuleText(cached, module);
              onLoadCallback();
              return;
            }
            if (has("dojo-sync-loader") && legacyMode) {
              if (module.isXd) {
                legacyMode == sync && (legacyMode = xd);
              } else if (module.isAmd && legacyMode != sync) {} else {
                var xhrCallback = function(text) {
                  if (legacyMode == sync) {
                    syncExecStack.unshift(module);
                    evalModuleText(text, module);
                    syncExecStack.shift();
                    runDefQ(module);
                    if (!module.cjs) {
                      setArrived(module);
                      finishExec(module);
                    }
                    if (module.finish) {
                      var finishMid = mid + "*finish",
                          finish = module.finish;
                      delete module.finish;
                      def(finishMid, ["dojo", ("dojo/require!" + finish.join(",")).replace(/\./g, "/")], function(dojo) {
                        forEach(finish, function(mid) {
                          dojo.require(mid);
                        });
                      });
                      execQ.unshift(getModule(finishMid));
                    }
                    onLoadCallback();
                  } else {
                    text = transformToAmd(module, text);
                    if (text) {
                      evalModuleText(text, module);
                      onLoadCallback();
                    } else {
                      injectingModule = module;
                      req.injectUrl(fixupUrl(url), onLoadCallback, module);
                      injectingModule = 0;
                    }
                  }
                };
                req.trace("loader-inject", ["xhr", module.mid, url, legacyMode != sync]);
                if (has("config-dojo-loader-catches")) {
                  try {
                    req.getText(url, legacyMode != sync, xhrCallback);
                  } catch (e) {
                    signal(error, makeError("xhrInjectFailed", [module, e]));
                  }
                } else {
                  req.getText(url, legacyMode != sync, xhrCallback);
                }
                return;
              }
            }
            req.trace("loader-inject", ["script", module.mid, url]);
            injectingModule = module;
            req.injectUrl(fixupUrl(url), onLoadCallback, module);
            injectingModule = 0;
          },
          defineModule = function(module, deps, def) {
            req.trace("loader-define-module", [module.mid, deps]);
            if (has("dojo-combo-api") && module.plugin && module.plugin.isCombo) {
              module.result = isFunction(def) ? def() : def;
              setArrived(module);
              finishExec(module);
              return module;
            }
            var mid = module.mid;
            if (module.injected === arrived) {
              signal(error, makeError("multipleDefine", module));
              return module;
            }
            mix(module, {
              deps: deps,
              def: def,
              cjs: {
                id: module.mid,
                uri: module.url,
                exports: (module.result = {}),
                setExports: function(exports) {
                  module.cjs.exports = exports;
                },
                config: function() {
                  return module.config;
                }
              }
            });
            for (var i = 0; deps[i]; i++) {
              deps[i] = getModule(deps[i], module);
            }
            if (has("dojo-sync-loader") && legacyMode && !waiting[mid]) {
              injectDependencies(module);
              execQ.push(module);
              checkComplete();
            }
            setArrived(module);
            if (!isFunction(def) && !deps.length) {
              module.result = def;
              finishExec(module);
            }
            return module;
          },
          runDefQ = function(referenceModule, mids) {
            var definedModules = [],
                module,
                args;
            while (defQ.length) {
              args = defQ.shift();
              mids && (args[0] = mids.shift());
              module = (args[0] && getModule(args[0])) || referenceModule;
              definedModules.push([module, args[1], args[2]]);
            }
            consumePendingCacheInsert(referenceModule);
            forEach(definedModules, function(args) {
              injectDependencies(defineModule.apply(null, args));
            });
          };
    }
    var timerId = 0,
        clearTimer = noop,
        startTimer = noop;
    if (has("dojo-timeout-api")) {
      clearTimer = function() {
        timerId && clearTimeout(timerId);
        timerId = 0;
      };
      startTimer = function() {
        clearTimer();
        if (req.waitms) {
          timerId = window.setTimeout(function() {
            clearTimer();
            signal(error, makeError("timeout", waiting));
          }, req.waitms);
        }
      };
    }
    if (has("dom")) {
      has.add("ie-event-behavior", doc.attachEvent && typeof Windows === "undefined" && (typeof opera === "undefined" || opera.toString() != "[object Opera]"));
    }
    if (has("dom") && (has("dojo-inject-api") || has("dojo-dom-ready-api"))) {
      var domOn = function(node, eventName, ieEventName, handler) {
        if (!has("ie-event-behavior")) {
          node.addEventListener(eventName, handler, false);
          return function() {
            node.removeEventListener(eventName, handler, false);
          };
        } else {
          node.attachEvent(ieEventName, handler);
          return function() {
            node.detachEvent(ieEventName, handler);
          };
        }
      },
          windowOnLoadListener = domOn(window, "load", "onload", function() {
            req.pageLoaded = 1;
            doc.readyState != "complete" && (doc.readyState = "complete");
            windowOnLoadListener();
          });
      if (has("dojo-inject-api")) {
        var scripts = doc.getElementsByTagName("script"),
            i = 0,
            script;
        while (!insertPointSibling) {
          if (!/^dojo/.test((script = scripts[i++]) && script.type)) {
            insertPointSibling = script;
          }
        }
        req.injectUrl = function(url, callback, owner) {
          var node = owner.node = doc.createElement("script"),
              onLoad = function(e) {
                e = e || window.event;
                var node = e.target || e.srcElement;
                if (e.type === "load" || /complete|loaded/.test(node.readyState)) {
                  loadDisconnector();
                  errorDisconnector();
                  callback && callback();
                }
              },
              loadDisconnector = domOn(node, "load", "onreadystatechange", onLoad),
              errorDisconnector = domOn(node, "error", "onerror", function(e) {
                loadDisconnector();
                errorDisconnector();
                signal(error, makeError("scriptError", [url, e]));
              });
          node.type = "text/javascript";
          node.charset = "utf-8";
          node.src = url;
          insertPointSibling.parentNode.insertBefore(node, insertPointSibling);
          return node;
        };
      }
    }
    if (has("dojo-log-api")) {
      req.log = function() {
        try {
          for (var i = 0; i < arguments.length; i++) {
            console.log(arguments[i]);
          }
        } catch (e) {}
      };
    } else {
      req.log = noop;
    }
    if (has("dojo-trace-api")) {
      var trace = req.trace = function(group, args) {
        if (trace.on && trace.group[group]) {
          signal("trace", [group, args]);
          for (var arg,
              dump = [],
              text = "trace:" + group + (args.length ? (":" + args[0]) : ""),
              i = 1; i < args.length; ) {
            arg = args[i++];
            if (isString(arg)) {
              text += ", " + arg;
            } else {
              dump.push(arg);
            }
          }
          req.log(text);
          dump.length && dump.push(".");
          req.log.apply(req, dump);
        }
      };
      mix(trace, {
        on: 1,
        group: {},
        set: function(group, value) {
          if (isString(group)) {
            trace.group[group] = value;
          } else {
            mix(trace.group, group);
          }
        }
      });
      trace.set(mix(mix(mix({}, defaultConfig.trace), userConfig.trace), dojoSniffConfig.trace));
      on("config", function(config) {
        config.trace && trace.set(config.trace);
      });
    } else {
      req.trace = noop;
    }
    var def = function(mid, dependencies, factory) {
      var arity = arguments.length,
          defaultDeps = ["require", "exports", "module"],
          args = [0, mid, dependencies];
      if (arity == 1) {
        args = [0, (isFunction(mid) ? defaultDeps : []), mid];
      } else if (arity == 2 && isString(mid)) {
        args = [mid, (isFunction(dependencies) ? defaultDeps : []), dependencies];
      } else if (arity == 3) {
        args = [mid, dependencies, factory];
      }
      if (has("dojo-amd-factory-scan") && args[1] === defaultDeps) {
        args[2].toString().replace(/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg, "").replace(/require\(["']([\w\!\-_\.\/]+)["']\)/g, function(match, dep) {
          args[1].push(dep);
        });
      }
      req.trace("loader-define", args.slice(0, 2));
      var targetModule = args[0] && getModule(args[0]),
          module;
      if (targetModule && !waiting[targetModule.mid]) {
        injectDependencies(defineModule(targetModule, args[1], args[2]));
      } else if (!has("ie-event-behavior") || !has("host-browser") || injectingCachedModule) {
        defQ.push(args);
      } else {
        targetModule = targetModule || injectingModule;
        if (!targetModule) {
          for (mid in waiting) {
            module = modules[mid];
            if (module && module.node && module.node.readyState === 'interactive') {
              targetModule = module;
              break;
            }
          }
          if (has("dojo-combo-api") && !targetModule) {
            for (var i = 0; i < combosPending.length; i++) {
              targetModule = combosPending[i];
              if (targetModule.node && targetModule.node.readyState === 'interactive') {
                break;
              }
              targetModule = 0;
            }
          }
        }
        if (has("dojo-combo-api") && isArray(targetModule)) {
          injectDependencies(defineModule(getModule(targetModule.shift()), args[1], args[2]));
          if (!targetModule.length) {
            combosPending.splice(i, 1);
          }
        } else if (targetModule) {
          consumePendingCacheInsert(targetModule);
          injectDependencies(defineModule(targetModule, args[1], args[2]));
        } else {
          signal(error, makeError("ieDefineFailed", args[0]));
        }
        checkComplete();
      }
    };
    def.amd = {vendor: "dojotoolkit.org"};
    if (has("dojo-requirejs-api")) {
      req.def = def;
    }
    mix(mix(req, defaultConfig.loaderPatch), userConfig.loaderPatch);
    on(error, function(arg) {
      try {
        console.error(arg);
        if (arg instanceof Error) {
          for (var p in arg) {
            console.log(p + ":", arg[p]);
          }
          console.log(".");
        }
      } catch (e) {}
    });
    mix(req, {
      uid: uid,
      cache: cache,
      packs: packs
    });
    if (has("dojo-publish-privates")) {
      mix(req, {
        paths: paths,
        aliases: aliases,
        modules: modules,
        legacyMode: legacyMode,
        execQ: execQ,
        defQ: defQ,
        waiting: waiting,
        packs: packs,
        mapProgs: mapProgs,
        pathsMapProg: pathsMapProg,
        listenerQueues: listenerQueues,
        computeMapProg: computeMapProg,
        computeAliases: computeAliases,
        runMapProg: runMapProg,
        compactPath: compactPath,
        getModuleInfo: getModuleInfo_
      });
    }
    if (global.define) {
      if (has("dojo-log-api")) {
        signal(error, makeError("defineAlreadyDefined", 0));
      }
      return;
    } else {
      global.define = def;
      global.require = req;
      if (has("host-node")) {
        require = req;
      }
    }
    if (has("dojo-combo-api") && req.combo && req.combo.plugins) {
      var plugins = req.combo.plugins,
          pluginName;
      for (pluginName in plugins) {
        mix(mix(getModule(pluginName), plugins[pluginName]), {
          isCombo: 1,
          executed: "executed",
          load: 1
        });
      }
    }
    if (has("dojo-config-api")) {
      forEach(delayedModuleConfig, function(c) {
        config(c);
      });
      var bootDeps = dojoSniffConfig.deps || userConfig.deps || defaultConfig.deps,
          bootCallback = dojoSniffConfig.callback || userConfig.callback || defaultConfig.callback;
      req.boot = (bootDeps || bootCallback) ? [bootDeps || [], bootCallback] : 0;
    }
    if (!has("dojo-built")) {
      !req.async && req(["dojo"]);
      req.boot && req.apply(null, req.boot);
    }
  })((function() {
    return this.dojoConfig || this.djConfig || this.require || {};
  })(), {
    hasCache: {
      "host-browser": 1,
      "dom": 1,
      "dojo-amd-factory-scan": 1,
      "dojo-loader": 1,
      "dojo-has-api": 1,
      "dojo-inject-api": 1,
      "dojo-timeout-api": 1,
      "dojo-trace-api": 1,
      "dojo-log-api": 1,
      "dojo-dom-ready-api": 1,
      "dojo-publish-privates": 1,
      "dojo-config-api": 1,
      "dojo-sniff": 1,
      "dojo-sync-loader": 1,
      "dojo-test-sniff": 1,
      "config-deferredInstrumentation": 1,
      "config-tlmSiblingOfDojo": 1
    },
    packages: [{
      name: 'dojo',
      location: '.'
    }, {
      name: 'tests',
      location: './tests'
    }, {
      name: 'dijit',
      location: '../dijit'
    }, {
      name: 'build',
      location: '../util/build'
    }, {
      name: 'doh',
      location: '../util/doh'
    }, {
      name: 'dojox',
      location: '../dojox'
    }, {
      name: 'demos',
      location: '../demos'
    }],
    trace: {
      "loader-inject": 0,
      "loader-define": 0,
      "loader-exec-module": 0,
      "loader-run-factory": 0,
      "loader-finish-exec": 0,
      "loader-define-module": 0,
      "loader-circular-dependency": 0,
      "loader-define-nonmodule": 0
    },
    async: 0,
    waitSeconds: 15
  });
})(require('process'));
