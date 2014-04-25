define(['JBrowse/Browser']
, function (Browser) {

    var config = {
        containerID: 'genome',
        baseUrl: 'data/jbrowse/',
        refSeqs: 'data/jbrowse/seq/refSeqs.json',
        include: ['data/jbrowse/trackList.json', 'data/jbrowse/edit-track.json', 'data/jbrowse/simple-track.json'],
        show_nav: false,
        show_tracklist: true,
        show_overview:  false,
        stores: {
            url: {
                type: "JBrowse/Store/SeqFeature/FromConfig",
                features: []
            }
        }
    };

    return ['$http', '$q', '$cookieStore', function (http, q, cookie) {
        this.browser = new Browser(config);

        this.sidebar_visible = true;
        this.toggle_sidebar  = function () {
            this.sidebar_visible = !this.sidebar_visible;
            var thisB = this.browser;
            setTimeout(function () {
                thisB.browserWidget.resize({w: $('#genome').width()});
            }, 0);
        };

        this.load = function (task) {
            this.browser.showRegion(task);
        };

        this.edits = function () {
            return this.browser.getEditTrack().store.features;
        };

        this.clear_edits = function () {
            this.browser.getEditTrack().store.features = {};
        };

        var jbrowse = this;

        var get = function () {
            return http.get('data/tasks/next')
            .then(function (response) {
                return response.data;
            })
            .then(function (task) {
                cookie.put('task', task);
                return task;
            });
        };

        var put = function (id, submission) {
            _.each(_.values(submission), function (f) {
                f.set('ref', f.get('seq_id'));
            });
            var data = JSON.stringify(submission, function (key, value) {
                if (key === '_parent' && value) {
                    return value.id();
                }
                else {
                    return value;
                }
            });
            return http.post('data/tasks/' + id, data).then(function (response) {
                console.log('saved submission');
            });
            // what on failure?
        }

        this.done = function () {
            var task = cookie.get('task');
            put(task.id, jbrowse.edits())
            .then(function () {
                cookie.remove('task');
                $('#thanks').modal();
            });
        }

        $('#thanks').on('hidden.bs.modal', function () {
            jbrowse.clear_edits()
            get()
            .then(function (task) {
                jbrowse.load(task);
            });
        });

        // initialize
        q.when(cookie.get('task'))
        .then(function (task) {
            return task || get();
        })
        .then(function (task) {
            jbrowse.load(task);
        });
    }];
});
