require.config({
    paths: {
        underscore: 'lib/underscore-amd/underscore',
        jquery:     'lib/jquery/jquery',
        bootstrap:  'lib/bootstrap/dist/js/bootstrap',
        moment:     'lib/moment/moment',
        angular:    'lib/angular/angular',
        ngCookies:  'lib/angular-cookies/angular-cookies',
        ngAnimate:  'lib/angular-animate/angular-animate',
        ngMoment:   'lib/angular-moment/angular-moment'
    },
    shim: {
        underscore: {
            exports: '_'
        },
        jquery:     {
            exports: '$'
        },
        bootstrap:  {
            deps:    ['jquery']
        },
        moment:     {
            exports: 'moment'
        },
        angular:    {
            exports: 'angular',
            deps:    ['jquery']
        },
        ngCookies:  {
            deps:    ['angular']
        },
        ngAnimate:  {
            deps:    ['angular']
        },
        ngMoment:   {
            deps:    ['angular', 'moment']
        }
    },
    map: {
        '*': {
            'less': 'lib/require-less/less',
            'html': 'lib/requirejs-text/text'
        }
    }
});

require(['underscore', 'jquery', 'angular', 'bootstrap', 'ngCookies', 'ngAnimate', 'ngMoment']
, function (_, $, angular) {

    'use strict';

    var app = angular.module('app', ['ngCookies', 'ngAnimate', 'angularMoment']);

    app.config(['$httpProvider'
    , function (http_provider) {

        var http_error_handler = ['$q', '$location', '$rootScope', function(q, location, root_scope) {

            var success = function (response) {
                return response;
            };

            var error = function(response) {
                var status = response.status;
                switch(status)
                {
                    case 401:
                        root_scope.view_login();
                        return q.reject(response);

                    default:
                        return q.reject(response);
                };
            };

            return function(promise) {
                return promise.then(success, error);
            };
        }];

        http_provider.responseInterceptors.push(http_error_handler);
    }]);

    app.config(['$locationProvider'
    , function (location_provider) {

        location_provider.html5Mode(true).hashPrefix('!');
    }])

    app.run(['$http', '$location', '$cookieStore', '$rootScope', '$injector', '$compile'
    , function (http, location, cookie, root_scope, injector, compile) {

        root_scope.view = function (path) {
            var view  = $('body');
            var scope = view.scope();
            var files = [
                'html!templates/' + path + '.html',
                'controllers/'    + path,
                'less!styles'     // Yeah, we load one and the same style sheet
                                  // for all the views.  A style sheet per view
                                  // just doesn't work.
            ];

            require(files
            , function (template, controller) {

                scope.$apply(function () {
                    view.html(template);
                    compile(view.contents())(scope);
                    injector.invoke(controller, scope);
                });
            });
        };

        root_scope.view_current = function () {
            var path = location.path().split('/')[1];
            if (!path) {
                path = 'dashboard';
            }
            root_scope.view(path);
        };

        root_scope.view_login = function () {
            root_scope.view('about');
        };

        root_scope.signin = function () {
            var form = $('form');
            var form_data = form.serialize();
            http.post('signin', form_data,
                      {
                          headers: {
                              'Content-Type': 'application/x-www-form-urlencoded'
                          }
                      })
            .then(function (response) {
                root_scope.user = response.data;
                root_scope.view_current();
            })
        };

        root_scope.signout = function () {
            http.post('signout').
            then(function () {
                root_scope.user = undefined;
                root_scope.view_login();
            });
        };

        root_scope.$on('$locationChangeSuccess'
        , function (event, next, prev) {

            var n = next.split('/').pop().split('#');
            var p = prev.split('/').pop().split('#');

            http.get('whoami')
            .then(function (response) {
                var user = response.data;
                if (!user) {
                    resolve_user();
                    return;
                }
                root_scope.user = user;

                if (n[0] == p[0] && n[1] != p[1]) {
                    root_scope.$broadcast('$hashChange', n[1], p[1]);
                    return;
                }

                root_scope.view_current();
            });
        });
    }]);

    angular.bootstrap(document, [app['name']]);
});