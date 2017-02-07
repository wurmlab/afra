/* */ 
"format cjs";
(function(process) {
  define(["./kernel", "../has", "require", "module", "../json", "./lang", "./array"], function(dojo, has, require, thisModule, json, lang, array) {
    if (!has("dojo-loader")) {
      console.error("cannot load the Dojo v1.x loader with a foreign loader");
      return 0;
    }
    has.add("dojo-fast-sync-require", 1);
    var makeErrorToken = function(id) {
      return {
        src: thisModule.id,
        id: id
      };
    },
        slashName = function(name) {
          return name.replace(/\./g, "/");
        },
        buildDetectRe = /\/\/>>built/,
        dojoRequireCallbacks = [],
        dojoRequireModuleStack = [],
        dojoRequirePlugin = function(mid, require, loaded) {
          dojoRequireCallbacks.push(loaded);
          array.forEach(mid.split(","), function(mid) {
            var module = getModule(mid, require.module);
            dojoRequireModuleStack.push(module);
            injectModule(module);
          });
          checkDojoRequirePlugin();
        },
        checkDojoRequirePlugin = (has("dojo-fast-sync-require") ? function() {
          var module,
              mid;
          for (mid in modules) {
            module = modules[mid];
            if (module.noReqPluginCheck === undefined) {
              module.noReqPluginCheck = /loadInit\!/.test(mid) || /require\!/.test(mid) ? 1 : 0;
            }
            if (!module.executed && !module.noReqPluginCheck && module.injected == requested) {
              return;
            }
          }
          guardCheckComplete(function() {
            var oldCallbacks = dojoRequireCallbacks;
            dojoRequireCallbacks = [];
            array.forEach(oldCallbacks, function(cb) {
              cb(1);
            });
          });
        } : (function() {
          var touched,
              traverse = function(m) {
                touched[m.mid] = 1;
                for (var t,
                    module,
                    deps = m.deps || [],
                    i = 0; i < deps.length; i++) {
                  module = deps[i];
                  if (!(t = touched[module.mid])) {
                    if (t === 0 || !traverse(module)) {
                      touched[m.mid] = 0;
                      return false;
                    }
                  }
                }
                return true;
              };
          return function() {
            var module,
                mid;
            touched = {};
            for (mid in modules) {
              module = modules[mid];
              if (module.executed || module.noReqPluginCheck) {
                touched[mid] = 1;
              } else {
                if (module.noReqPluginCheck !== 0) {
                  module.noReqPluginCheck = /loadInit\!/.test(mid) || /require\!/.test(mid) ? 1 : 0;
                }
                if (module.noReqPluginCheck) {
                  touched[mid] = 1;
                } else if (module.injected !== arrived) {
                  touched[mid] = 0;
                }
              }
            }
            for (var t,
                i = 0,
                end = dojoRequireModuleStack.length; i < end; i++) {
              module = dojoRequireModuleStack[i];
              if (!(t = touched[module.mid])) {
                if (t === 0 || !traverse(module)) {
                  return;
                }
              }
            }
            guardCheckComplete(function() {
              var oldCallbacks = dojoRequireCallbacks;
              dojoRequireCallbacks = [];
              array.forEach(oldCallbacks, function(cb) {
                cb(1);
              });
            });
          };
        })()),
        dojoLoadInitPlugin = function(mid, require, loaded) {
          require([mid], function(bundle) {
            require(bundle.names, function() {
              for (var scopeText = "",
                  args = [],
                  i = 0; i < arguments.length; i++) {
                scopeText += "var " + bundle.names[i] + "= arguments[" + i + "]; ";
                args.push(arguments[i]);
              }
              eval(scopeText);
              var callingModule = require.module,
                  requireList = [],
                  i18nDeps,
                  syncLoaderApi = {
                    provide: function(moduleName) {
                      moduleName = slashName(moduleName);
                      var providedModule = getModule(moduleName, callingModule);
                      if (providedModule !== callingModule) {
                        setArrived(providedModule);
                      }
                    },
                    require: function(moduleName, omitModuleCheck) {
                      moduleName = slashName(moduleName);
                      omitModuleCheck && (getModule(moduleName, callingModule).result = nonmodule);
                      requireList.push(moduleName);
                    },
                    requireLocalization: function(moduleName, bundleName, locale) {
                      if (!i18nDeps) {
                        i18nDeps = ["dojo/i18n"];
                      }
                      locale = (locale || dojo.locale).toLowerCase();
                      moduleName = slashName(moduleName) + "/nls/" + (/root/i.test(locale) ? "" : locale + "/") + slashName(bundleName);
                      if (getModule(moduleName, callingModule).isXd) {
                        i18nDeps.push("dojo/i18n!" + moduleName);
                      }
                    },
                    loadInit: function(f) {
                      f();
                    }
                  },
                  hold = {},
                  p;
              try {
                for (p in syncLoaderApi) {
                  hold[p] = dojo[p];
                  dojo[p] = syncLoaderApi[p];
                }
                bundle.def.apply(null, args);
              } catch (e) {
                signal("error", [makeErrorToken("failedDojoLoadInit"), e]);
              } finally {
                for (p in syncLoaderApi) {
                  dojo[p] = hold[p];
                }
              }
              if (i18nDeps) {
                requireList = requireList.concat(i18nDeps);
              }
              if (requireList.length) {
                dojoRequirePlugin(requireList.join(","), require, loaded);
              } else {
                loaded();
              }
            });
          });
        },
        extractApplication = function(text, startSearch, startApplication) {
          var parenRe = /\(|\)/g,
              matchCount = 1,
              match;
          parenRe.lastIndex = startSearch;
          while ((match = parenRe.exec(text))) {
            if (match[0] == ")") {
              matchCount -= 1;
            } else {
              matchCount += 1;
            }
            if (matchCount == 0) {
              break;
            }
          }
          if (matchCount != 0) {
            throw "unmatched paren around character " + parenRe.lastIndex + " in: " + text;
          }
          return [dojo.trim(text.substring(startApplication, parenRe.lastIndex)) + ";\n", parenRe.lastIndex];
        },
        removeCommentRe = /(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg,
        syncLoaderApiRe = /(^|\s)dojo\.(loadInit|require|provide|requireLocalization|requireIf|requireAfterIf|platformRequire)\s*\(/mg,
        amdLoaderApiRe = /(^|\s)(require|define)\s*\(/m,
        extractLegacyApiApplications = function(text, noCommentText) {
          var match,
              startSearch,
              startApplication,
              application,
              loadInitApplications = [],
              otherApplications = [],
              allApplications = [];
          noCommentText = noCommentText || text.replace(removeCommentRe, function(match) {
            syncLoaderApiRe.lastIndex = amdLoaderApiRe.lastIndex = 0;
            return (syncLoaderApiRe.test(match) || amdLoaderApiRe.test(match)) ? "" : match;
          });
          while ((match = syncLoaderApiRe.exec(noCommentText))) {
            startSearch = syncLoaderApiRe.lastIndex;
            startApplication = startSearch - match[0].length;
            application = extractApplication(noCommentText, startSearch, startApplication);
            if (match[2] == "loadInit") {
              loadInitApplications.push(application[0]);
            } else {
              otherApplications.push(application[0]);
            }
            syncLoaderApiRe.lastIndex = application[1];
          }
          allApplications = loadInitApplications.concat(otherApplications);
          if (allApplications.length || !amdLoaderApiRe.test(noCommentText)) {
            return [text.replace(/(^|\s)dojo\.loadInit\s*\(/g, "\n0 && dojo.loadInit("), allApplications.join(""), allApplications];
          } else {
            return 0;
          }
        },
        transformToAmd = function(module, text) {
          var extractResult,
              id,
              names = [],
              namesAsStrings = [];
          if (buildDetectRe.test(text) || !(extractResult = extractLegacyApiApplications(text))) {
            return 0;
          }
          id = module.mid + "-*loadInit";
          for (var p in getModule("dojo", module).result.scopeMap) {
            names.push(p);
            namesAsStrings.push('"' + p + '"');
          }
          return "// xdomain rewrite of " + module.mid + "\n" + "define('" + id + "',{\n" + "\tnames:" + json.stringify(names) + ",\n" + "\tdef:function(" + names.join(",") + "){" + extractResult[1] + "}" + "});\n\n" + "define(" + json.stringify(names.concat(["dojo/loadInit!" + id])) + ", function(" + names.join(",") + "){\n" + extractResult[0] + "});";
        },
        loaderVars = require.initSyncLoader(dojoRequirePlugin, checkDojoRequirePlugin, transformToAmd),
        sync = loaderVars.sync,
        requested = loaderVars.requested,
        arrived = loaderVars.arrived,
        nonmodule = loaderVars.nonmodule,
        executing = loaderVars.executing,
        executed = loaderVars.executed,
        syncExecStack = loaderVars.syncExecStack,
        modules = loaderVars.modules,
        execQ = loaderVars.execQ,
        getModule = loaderVars.getModule,
        injectModule = loaderVars.injectModule,
        setArrived = loaderVars.setArrived,
        signal = loaderVars.signal,
        finishExec = loaderVars.finishExec,
        execModule = loaderVars.execModule,
        getLegacyMode = loaderVars.getLegacyMode,
        guardCheckComplete = loaderVars.guardCheckComplete;
    dojoRequirePlugin = loaderVars.dojoRequirePlugin;
    dojo.provide = function(mid) {
      var executingModule = syncExecStack[0],
          module = lang.mixin(getModule(slashName(mid), require.module), {
            executed: executing,
            result: lang.getObject(mid, true)
          });
      setArrived(module);
      if (executingModule) {
        (executingModule.provides || (executingModule.provides = [])).push(function() {
          module.result = lang.getObject(mid);
          delete module.provides;
          module.executed !== executed && finishExec(module);
        });
      }
      return module.result;
    };
    has.add("config-publishRequireResult", 1, 0, 0);
    dojo.require = function(moduleName, omitModuleCheck) {
      function doRequire(mid, omitModuleCheck) {
        var module = getModule(slashName(mid), require.module);
        if (syncExecStack.length && syncExecStack[0].finish) {
          syncExecStack[0].finish.push(mid);
          return undefined;
        }
        if (module.executed) {
          return module.result;
        }
        omitModuleCheck && (module.result = nonmodule);
        var currentMode = getLegacyMode();
        injectModule(module);
        currentMode = getLegacyMode();
        if (module.executed !== executed && module.injected === arrived) {
          loaderVars.guardCheckComplete(function() {
            execModule(module);
          });
        }
        if (module.executed) {
          return module.result;
        }
        if (currentMode == sync) {
          if (module.cjs) {
            execQ.unshift(module);
          } else {
            syncExecStack.length && (syncExecStack[0].finish = [mid]);
          }
        } else {
          execQ.push(module);
        }
        return undefined;
      }
      var result = doRequire(moduleName, omitModuleCheck);
      if (has("config-publishRequireResult") && !lang.exists(moduleName) && result !== undefined) {
        lang.setObject(moduleName, result);
      }
      return result;
    };
    dojo.loadInit = function(f) {
      f();
    };
    dojo.registerModulePath = function(moduleName, prefix) {
      var paths = {};
      paths[moduleName.replace(/\./g, "/")] = prefix;
      require({paths: paths});
    };
    dojo.platformRequire = function(modMap) {
      var result = (modMap.common || []).concat(modMap[dojo._name] || modMap["default"] || []),
          temp;
      while (result.length) {
        if (lang.isArray(temp = result.shift())) {
          dojo.require.apply(dojo, temp);
        } else {
          dojo.require(temp);
        }
      }
    };
    dojo.requireIf = dojo.requireAfterIf = function(condition, moduleName, omitModuleCheck) {
      if (condition) {
        dojo.require(moduleName, omitModuleCheck);
      }
    };
    dojo.requireLocalization = function(moduleName, bundleName, locale) {
      require(["../i18n"], function(i18n) {
        i18n.getLocalization(moduleName, bundleName, locale);
      });
    };
    return {
      extractLegacyApiApplications: extractLegacyApiApplications,
      require: dojoRequirePlugin,
      loadInit: dojoLoadInitPlugin
    };
  });
})(require('process'));
