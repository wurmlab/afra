({
    appDir: 'www',
    baseUrl: '.',
    mainConfigFile: 'www/app.js',
    dir: 'www/build',
    modules: [
        {
            name: 'app',
            include: ['controllers/dashboard', 'controllers/curate']
        }
    ],
    paths: {
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
