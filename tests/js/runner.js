require.config({
    baseUrl: '../../www/',
    paths: {
        underscore: 'lib/underscore/underscore',
        jquery:     'lib/jquery/dist/jquery',
        bootstrap:  'lib/bootstrap/dist/js/bootstrap',
        contextmenu:'lib/bootstrap-contextmenu/bootstrap-contextmenu',
        moment:     'lib/moment/moment',
        angular:    'lib/angular/angular',
        ngSanitize: 'lib/angular-sanitize/angular-sanitize',
        ngAnimate:  'lib/angular-animate/angular-animate',
        'angular-moment': 'lib/angular-moment/angular-moment',
        bionode:    'lib/bionode/amd/bionode'
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
        contextmenu: {
            deps:    ['bootstrap']
        },
        angular:    {
            exports: 'angular',
            deps:    ['jquery']
        },
        ngSanitize: {
            deps:    ['angular']
        },
        ngAnimate:  {
            deps:    ['angular']
        }
    },
    packages:[{
        name:     'jasmine',
        location:  "../../www/lib/jasmine/lib/jasmine-core"
    },
    {
        name:     'dojo',
        location: 'lib/dojo'
    },
    {
        name:     'dijit',
        location: 'lib/dijit'
    },
    {
        name:     'dojox',
        location: 'lib/dojox'
    },
    {
        name:     'jszlib',
        location: 'lib/jszlib'
    },
    {
        name:     'dgrid',
        location: 'lib/dgrid'
    },
    {
        name:     'xstyle',
        location: 'lib/xstyle'
    },
    {
        name:     'put-selector',
        location: 'lib/put-selector'
    },
    {
        name:     'FileSaver',
        location: 'lib/FileSaver'
    },
    {
        name:     'jDataView',
        location: 'lib/jDataView/src',
        main:     'jdataview'
    },
    {
        name:     'jqueryui',
        location: 'lib/jquery.ui/ui'
    }],
    map: {
        '*': {
            'less': 'lib/require-less/less',
            'html': 'lib/requirejs-text/text'
        }
    }
});

require(['jasmine/jasmine']
, function () {

    require(['jasmine/jasmine-html']
    , function () {

        /*******************************
         * copied from jasmine/boot.js *
         *******************************/

        /**
         * ## Require &amp; Instantiate
         *
         * Require Jasmine's core files. Specifically, this requires and attaches all of Jasmine's code to the `jasmine` reference.
         */
        window.jasmine = jasmineRequire.core(jasmineRequire);

        /**
         * Since this is being run in a browser and the results should populate to an HTML page, require the HTML-specific Jasmine code, injecting the same reference.
         */
        jasmineRequire.html(jasmine);

        /**
         * Create the Jasmine environment. This is used to run all specs in a project.
         */
        var env = jasmine.getEnv();

        /**
         * ## The Global Interface
         *
         * Build up the functions that will be exposed as the Jasmine public interface. A project can customize, rename or alias any of these functions as desired, provided the implementation remains unchanged.
         */
        var jasmineInterface = jasmineRequire.interface(jasmine, env);

        /**
         * Add all of the Jasmine global/public interface to the proper global, so a project can use the public interface directly. For example, calling `describe` in specs instead of `jasmine.getEnv().describe`.
         */
        if (typeof window == "undefined" && typeof exports == "object") {
            extend(exports, jasmineInterface);
        } else {
            extend(window, jasmineInterface);
        }

        /**
         * ## Runner Parameters
         *
         * More browser specific code - wrap the query string in an object and to allow for getting/setting parameters from the runner user interface.
         */

        var queryString = new jasmine.QueryString({
            getWindowLocation: function() { return window.location; }
        });

        var catchingExceptions = queryString.getParam("catch");
        env.catchExceptions(typeof catchingExceptions === "undefined" ? true : catchingExceptions);

        /**
         * ## Reporters
         * The `HtmlReporter` builds all of the HTML UI for the runner page. This reporter paints the dots, stars, and x's for specs, as well as all spec names and all failures (if any).
         */
        var htmlReporter = new jasmine.HtmlReporter({
            env: env,
            onRaiseExceptionsClick: function() { queryString.setParam("catch", !env.catchingExceptions()); },
            getContainer: function() { return document.body; },
            createElement: function() { return document.createElement.apply(document, arguments); },
            createTextNode: function() { return document.createTextNode.apply(document, arguments); },
            timer: new jasmine.Timer()
        });

        /**
         * The `jsApiReporter` also receives spec results, and is used by any environment that needs to extract the results  from JavaScript.
         */
        env.addReporter(jasmineInterface.jsApiReporter);
        env.addReporter(htmlReporter);

        /**
         * Filter which specs will be run by matching the start of the full name against the `spec` query param.
         */
        var specFilter = new jasmine.HtmlSpecFilter({
            filterString: function() { return queryString.getParam("spec"); }
        });

        env.specFilter = function(spec) {
            return specFilter.matches(spec.getFullName());
        };

        /**
         * Setting up timing functions to be able to be overridden. Certain browsers (Safari, IE 8, phantomjs) require this hack.
         */
        window.setTimeout = window.setTimeout;
        window.setInterval = window.setInterval;
        window.clearTimeout = window.clearTimeout;
        window.clearInterval = window.clearInterval;

        /**
         * Helper function for readability above.
         */
        function extend(destination, source) {
            for (var property in source) destination[property] = source[property];
            return destination;
        }

        require([
            'JBrowse/Browser',
            "ExportGFF3.spec.js",
            "ExportGFF3.spec.js",
            "LazyArray.spec.js",
            "FeatureLayout.spec.js",
            "BigWig.spec.js",
            "ConfigManager.spec.js",
            "BAM.spec.js",
            "RemoteBinaryFile.spec.js",
            "Util.spec.js",
            "AddFiles.spec.js",
            "GBrowseParser.spec.js",
            "NestedFrequencyTable.spec.js",
            "TabixIndex.spec.js",
            "TabixIndexedFile.spec.js",
            "RESTStore.spec.js",
            "RegularizeRefSeqs.spec.js",
            "GFF3.spec.js"
        ]
        , function () {
            htmlReporter.initialize();
            env.execute();
        });
    });
});
