define(['JBrowse/Browser']
, function (Browser) {

    var config = {
        containerID:    'genome',
        show_nav:       false,
        show_overview:  false,
        show_tracklist: true
    };

    return ['$q', '$http', '$location', function (q, http, location) {
        this.sidebar_visible = true;
        this.toggle_sidebar  = function () {
            this.sidebar_visible = !this.sidebar_visible;
            var thisB = this.browser;
            setTimeout(function () {
                thisB.browserWidget.resize({w: $('#genome').width()});
            }, 0);
        };

        this.load = function (task) {
            config = $.extend({}, config, task);
            if (this.browser) {
                delete this.browser;
            }
            $('<div id="genome"></div>').insertAfter('.controls-top');
            this.browser = new Browser(config);
        };

        this.edits = function () {
            return this.browser.getEditTrack().store.features;
        };

        var jbrowse = this;

        var get = function () {
            var params = location.search();
            params.id  = params.id || 'next';
            return http.get('data/tasks/' + params.id)
            .then(function (response) {
                return response.data;
            });
        };

        var put = function (id, submission) {
            _.each(submission, function (f) {
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
            put(this.browser.config.id, this.edits())
            .then(function () {
                $('#thanks').modal();
            });
        };

        this.contribute_more = function () {
            var handler = function () {
                get()
                .then(function (task) {
                    jbrowse.load(task);
                });
                $(this).off('hidden.bs.modal', handler);
            };
            $('#thanks').modal('hide').on('hidden.bs.modal', handler);
        };

        this.go_back_to_dashboard = function () {
            var scope = this;
            var handler = function () {
                scope.$apply(function () {
                    location.path('/');
                });
                $(this).off('hidden.bs.modal', handler);
            };
            $('#thanks').modal('hide').on('hidden.bs.modal', handler);
        }

        // initialize
        get().then(function (task) {
            jbrowse.load(task);
        });
    }];
});
