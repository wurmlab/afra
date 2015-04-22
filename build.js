({
    appDir: 'www',
    baseUrl: '.',
    mainConfigFile: 'www/app.js',
    dir: 'www/build',
    modules: [
        {
            name: 'app',
            include: ['controllers/about', 'controllers/dashboard']
        },
        {
            name: 'controllers/curate',
            include: [
                'JBrowse/Store/Sequence/StaticChunked',
                'JBrowse/Store/SeqFeature/NCList',
                'JBrowse/View/Track/Sequence',
                'JBrowse/View/Track/DraggableHTMLFeatures',
                'JBrowse/View/Track/Alignments2',
                'JBrowse/View/Track/SNPCoverage'
            ],
            excludeShallow: [
                'jquery',
                'bootstrap',
                'underscore',
                'dojo/has',
                'dojo/_base/sniff'
            ]
        }
    ],
    paths: {
        'dijit/form/_Spinner':      'empty:',
        'dijit/form/ValidationTextBox': 'empty:',
        'dijit/Tooltip':            'empty:',
        'dojo/request':             'empty:',

        'dojo/query':               'empty:',
        'dijit/layout/ContentPane': 'empty:',
        'dijit/Dialog':             'empty:',
        'dijit/form/Button':        'empty:',
        'dijit/DropDownMenu':       'empty:',
        'dijit/MenuItem':           'empty:',
        'dijit/CheckedMenuItem':    'empty:',
        'dijit/MenuSeparator':      'empty:',
        'xstyle/css':               'empty:',
        'dgrid/List':               'empty:',
        'dijit/form/CheckBox':      'empty:',
        'dijit/form/Select':        'empty:',
        'dijit/form/TextBox':       'empty:',
        'dojox/gfx':                'empty:',
        'dojo/number':              'empty:',
        'put-selector/put':         'empty:'
    },
    preserveLicenseComments: false,
    optimize: 'uglify2'
    //optimize: 'none'
})
