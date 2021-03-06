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

        // Events handler to toggle chevrons on checklist headers. Called via
        // ng-click from curate.html.
        this.toggleChevron = function (e) {
            // Toggle chevron on the element that was clicked.
            $('.fa', e.target).toggleClass('fa-rotate-90');

            // We have an accordion setup: expanding one collapses the other.
            // Need to change chevron on the panel that was collapsed.
            $(e.target).parent().siblings().
                find('.fa-rotate-90').removeClass('fa-rotate-90');
        };

        this.load = function (task) {
            this.browser = new Browser($.extend(task, config));
        };

        this.name = function () {
            var names = this.browser && this.browser.config &&
                this.browser.config.meta && this.browser.config.meta.names || [];
            return 'Curate ' + names.join(' & ');
        };

        this.edits = function () {
            return this.browser.getEditTrack().store.features;
        };

        var jbrowse = this;

        var get = function () {
            var params = location.search();
            var url = 'data/tasks/';
            if (params.id) {
                url = url + params.id;
                if (params.uid) {
                    url = url + '?uid=' + params.uid;
                }
            }
            else {
                url = url + 'next';
            }
            return http.get(url)
            .then(function (response) {
                return response.data;
            });
        };

        // convert to db savable form
        var normalizeFeatures = function (features) {
            return _.map(features, function (f) {
                var data = $.extend({}, f.data);
                if (data.subfeatures) {
                    data.subfeatures = normalizeFeatures(data.subfeatures);
                }
                return data;
            });
        };

        var put = function (id, transcripts) {
            var data = {
                type:  'correction',
                value: normalizeFeatures(transcripts)
            }
            return http.post('data/tasks/' + id, data).then(function (response) {
                localStorage.clear();
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
            var scope = this;
            var handler = function () {
                scope.$apply(function () {
                    location.search('id', null);
                });
                scope.view_current();
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
