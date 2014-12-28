define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/Deferred',
    'dijit/MenuItem',
    'JBrowse/Component',
    'JBrowse/View/SearchSeqDialog'
],
function (
    declare,
    lang,
    Deferred,
    dijitMenuItem,
    Component,
    SearchSeqDialog
) {

return declare(Component,
{
    constructor: function (args) {
        this._searchTrackCount = 0;
    },

    createSearchTrack: function () {
        var searchDialog = new SearchSeqDialog();
        var thisB = this;
        searchDialog.show(function (searchParams) {
            if (!searchParams)
                return;

            var storeConf = {
                browser: thisB.browser,
                refSeq: thisB.browser.refSeq,
                type: 'JBrowse/Store/SeqFeature/RegexSearch',
                searchParams: searchParams
            };
            var storeName = thisB.browser._addStoreConfig(undefined, storeConf);
            storeConf.name = storeName;
            var searchTrackConfig = {
                type: 'JBrowse/View/Track/CanvasFeatures',
                label: 'search_track_' + (thisB._searchTrackCount++),
                key: "Search reference sequence for '" + searchParams.expr + "'",
                deletable: true,
                metadata: {
                    category: 'Local tracks',
                    Description: "Contains all matches of the text string/regular expression '" + storeConf.searchExpr + "'"
                },
                store: storeName
            };

            // send out a message about how the user wants to create the new track
            thisB.browser.publish( '/jbrowse/v1/v/tracks/new', [searchTrackConfig] );

            // Open the track immediately
            thisB.browser.publish( '/jbrowse/v1/v/tracks/show', [searchTrackConfig] );
        });
    }
});

});
