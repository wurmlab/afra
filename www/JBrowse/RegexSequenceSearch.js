define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/Deferred',
    'dijit/MenuItem',
    'JBrowse/Component',
    'jquery.onenter',
    'bootstrap.autofocus'
],
function (
    declare,
    lang,
    Deferred,
    dijitMenuItem,
    Component
) {

return declare(Component,
{
    constructor: function (args) {
        this._searchTrackCount = 0;
        this.searchModal  = $('#sequence-search-modal');
        this.searchButton = $('#create-search-track');
        this.searchButton.on('click', _.bind(this.createSearchTrack, this));

        $('input[name=expr]', this.searchModal).onenter(this.searchButton);
    },

    createSearchTrack: function () {
        this.searchModal.modal('hide');

        searchParams = this._getSearchParams();
        if(!searchParams)
          return;

        var storeConf = {
          browser: this.browser,
          refSeq: this.browser.refSeq,
          type: 'JBrowse/Store/SeqFeature/RegexSearch',
          searchParams: searchParams
        };

        var storeName = this.browser._addStoreConfig(undefined, storeConf);
        storeConf.name = storeName;

        var label = 'search_track_' + (this._searchTrackCount++);

        var searchTrackConfig = {
          type: 'JBrowse/View/Track/CanvasFeatures',
          label: label,
          key: "Search reference sequence for '" + searchParams.expr + "'",
          deletable: true,
          metadata: {
            category: 'Local tracks',
            Description: "Contains all matches of the text string/regular expression '" + storeConf.searchExpr + "'"
          },
          store: storeName
        };

        // do something after the track has been opened by JB
        this.browser.subscribe('/jbrowse/v1/n/tracks/visibleChanged'
        , _.bind(function (visibleTrackNames) {
            visibleTrackNames = visibleTrackNames[0];
            if (_.contains(visibleTrackNames, label)) {
                this.browser.view.scrollToBottom();
            }
        }, this));

        // send out a message about how the user wants to create the new track
        this.browser.publish( '/jbrowse/v1/v/tracks/new', [searchTrackConfig] );

        // Open the track immediately
        this.browser.publish( '/jbrowse/v1/v/tracks/show', [searchTrackConfig] );
    },

    _getSearchParams: function () {
        var inputs = $(':input', this.searchModal).serializeArray();
        var values = {
          expr: "",
          caseIgnore: true,
          fwdStrand: true,
          revStrand: true,
          maxLen: 100,
        };

        _.each(inputs, function(field) {
            if (field.value === "") {
                values[field.name] = true;
            } else if (field.name === "expr") {
                values[field.name] = field.value;
            } else if (field.value === "AA") {
                values[field.name] = true;
            }
        });
        return values;
    }
});

});
