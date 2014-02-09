define([
            'dojo/_base/declare',
            'jquery',
            'jqueryui/droppable',
            'jqueryui/resizable',
            'dijit/Menu',
            'dijit/MenuItem',
            'dijit/MenuSeparator',
            'dijit/PopupMenuItem',
            'dijit/form/Button',
            'dijit/form/DropDownButton',
            'dijit/DropDownMenu',

            'dijit/Dialog',
            'dojox/grid/DataGrid',
            'dojo/data/ItemFileWriteStore',
            'JBrowse/View/Track/DraggableHTMLFeatures',
            'JBrowse/FeatureSelectionManager',
            'JBrowse/JSONUtils',
            'JBrowse/BioFeatureUtils',
            'JBrowse/SequenceSearch',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util',
            'JBrowse/View/GranularRectLayout',
        ],
        function(declare,
                 $,
                 droppable,
                 resizable,
                 dijitMenu,
                 dijitMenuItem,
                 dijitMenuSeparator,
                 dijitPopupMenuItem,
                 dijitButton,
                 dijitDropDownButton,
                 dijitDropDownMenu,
                 dijitDialog,
                 dojoxDataGrid,
                 dojoItemFileWriteStore,
                 DraggableFeatureTrack,
                 FeatureSelectionManager,
                 JSONUtils,
                 BioFeatureUtils,
                 SequenceSearch,
                 SimpleFeature,
                 Util,
                 Layout) {

var creation_count = 0;
var contextMenuItems;
var context_path = "..";

var EditTrack = declare(DraggableFeatureTrack,
{
    constructor: function( args ) {
        this.is_edit_track = true;
        this.has_custom_context_menu = true;
        this.exportAdapters = [];

        this.selectionManager = this.setSelectionManager(this.browser.annotSelectionManager);

        /**
         * only show residues overlay if "pointer-events" CSS property is supported
         *   (otherwise will interfere with passing of events to features beneath the overlay)
         */
        this.useResiduesOverlay = 'pointerEvents' in document.body.style;
        this.FADEIN_RESIDUES = false;
        this.selectionClass = "selected-annotation";


        this.gview.browser.subscribe("/jbrowse/v1/n/navigate", dojo.hitch(this, function(currRegion) {
            if (currRegion.ref != this.refSeq.name) {
                if (this.listener && this.listener.fired == -1 ) {
                    this.listener.cancel();
                }
            }
        }));
    },

    _defaultConfig: function() {
        var thisConfig = this.inherited(arguments);
        thisConfig.noExport = true;  // turn off default "Save track data" "
        thisConfig.style.centerChildrenVertically = false;
        return thisConfig;
    },

    setViewInfo: function(genomeView, numBlocks, trackDiv, labelDiv, widthPct, widthPx, scale) {
        this.inherited( arguments );
        var track = this;
        this.makeTrackDroppable();
        this.hide();
        this.show();
    },

    renderSubfeature: function( feature, featDiv, subfeature,
                                displayStart, displayEnd, block) {
        var subdiv = this.inherited( arguments );

        /**
         *  setting up annotation resizing via pulling of left/right edges but
         *  if subfeature is not selectable, do not bind mouse down
         */
        if (subdiv && subdiv != null && (! this.selectionManager.unselectableTypes[subfeature.get('type')]) )  {
            $(subdiv).bind("mousedown", dojo.hitch(this, 'onAnnotMouseDown'));
        }
        return subdiv;
    },

    /**
     *   handles mouse down on an annotation subfeature
     *   to make the annotation resizable by pulling the left/right edges
     */
    onAnnotMouseDown: function(event)  {
        var track = this;
        event = event || window.event;
        var elem = (event.currentTarget || event.srcElement);
        var featdiv = track.getLowestFeatureDiv(elem);

        if (featdiv && (featdiv != null))  {
            if (dojo.hasClass(featdiv, "ui-resizable"))  {
            }
            else {
                var scale = track.gview.bpToPx(1);

                // if zoomed int to showing sequence residues, then make edge-dragging snap to interbase pixels
                var gridvals;
                var charSize = track.browser.getSequenceCharacterSize();
                if (scale === charSize.width) { gridvals = [track.gview.charWidth, 1]; }
                else  { gridvals = false; }

                $(featdiv).resizable({
                    handles: "e, w",
                    helper: "ui-resizable-helper",
                    autohide: false,
                    grid: gridvals,

                    stop: function(event, ui)  {
                        var gview = track.gview;
                        var oldPos = ui.originalPosition;
                        var newPos = ui.position;
                        var oldSize = ui.originalSize;
                        var newSize = ui.size;
                        var leftDeltaPixels = newPos.left - oldPos.left;
                        var leftDeltaBases = Math.round(gview.pxToBp(leftDeltaPixels));
                        var oldRightEdge = oldPos.left + oldSize.width;
                        var newRightEdge = newPos.left + newSize.width;
                        var rightDeltaPixels = newRightEdge - oldRightEdge;
                        var rightDeltaBases = Math.round(gview.pxToBp(rightDeltaPixels));
                        var subfeat = ui.originalElement[0].subfeature;
                        var parent  = subfeat.parent();
                        var subfeatures = parent.get('subfeatures');
                        var subfeatid;

                        for (var i in subfeatures) {
                            if (subfeatures[i].id() == subfeat.id()) {
                                subfeatid = i;
                            }
                        };
                        track.resizeExon(parent, subfeatid, leftDeltaBases, rightDeltaBases);
                        //subfeat[1] = subfeat[1] + leftDeltaBases;
                        //subfeat[2] = subfeat[2] + leftDeltaBases;
                        //console.log(track.store.features);
                        //console.log(parent);
                        //var new_feature = track.newTranscript(parent);
                        ////var new_feature = track.create_annotation(parent);
                        //track.store.replace(new_feature);
                        //console.log(track.store.features);
                        //track.changed();
                    }
                });
            }
        }
        event.stopPropagation();
    },

    /**
     *  feature click no-op (to override FeatureTrack.onFeatureClick, which conflicts with mouse-down selection
     */
    onFeatureClick: function(event) {
        event = event || window.event;
        var elem = (event.currentTarget || event.srcElement);
        var featdiv = this.getLowestFeatureDiv( elem );
        if (featdiv && (featdiv != null))  {
        }
    },

    makeTrackDroppable: function() {
        var target_track = this;
        var target_trackdiv = target_track.div;

        $(target_trackdiv).droppable(  {
            accept: ".selected-feature",
            drop: function(event, ui)  {
                var dropped_feats = target_track.browser.featSelectionManager.getSelection();
                for (var i in dropped_feats)  {
                    target_track.addTranscript(dropped_feats[i].feature);
                }
            }
        });
    },

    addTranscript: function (transcript) {
        var new_transcript = this.newTranscript(transcript);
        this.store.insert(new_transcript);
        this.changed();
    },

    resizeExon: function (transcript, index, leftDelta, rightDelta) {
        var new_transcript = this.newTranscript(transcript);
        var subfeatures = new_transcript.get('subfeatures');
        var exon = subfeatures[index];

        var fmin = exon.get('start');
        var fmax = exon.get('end');
        fmin = fmin + leftDelta;
        fmax = fmax + rightDelta;
        exon.set('start', fmin);
        exon.set('end', fmax);

        if (new_transcript.get('start') > fmin){
            new_transcript.set('start', fmin);
        }
        if (new_transcript.get('end') < fmax) {
            new_transcript.set('end', fmax);
        }

        this.store.deleteFeatureById(transcript.id());
        this.store.insert(new_transcript);
        this.changed();

        var featdiv = this.getFeatDiv(exon);
        $(featdiv).trigger('mousedown');
    },

    newTranscript: function(from)  {
        var feature = new SimpleFeature({
            data: {
                name:   from.get('name'),
                ref:    from.get('seq_id'),
                start:  from.get('start'),
                end:    from.get('end'),
                strand: from.get('strand')
            }
        });

        var from_subfeatures = from.get('subfeatures');

        var subfeatures = new Array();
        for (var i = 0; i < from_subfeatures.length; ++i) {
            var from_subfeature = from_subfeatures[i];
            var subfeature = new SimpleFeature({
                data: {
                    start:  from_subfeature.get('start'),
                    end:    from_subfeature.get('end'),
                    strand: from_subfeature.get('strand'),
                    type:   from_subfeature.get('type')
                },
                parent: feature
            });
            subfeatures.push(subfeature);
        }
        feature.set('subfeatures', subfeatures);
        //console.log(feature);
        return feature;
    },

    /* feature_records ==> { feature: the_feature, track: track_feature_is_from } */
    addToAnnotation: function(annot, feature_records)  {
        var new_transcript = this.newTranscript(annot);
        var from_feature = feature_records[0].feature;
        var feature = new SimpleFeature({
            data: {
                start:  from_feature.get('start'),
                end:    from_feature.get('end'),
                strand: from_feature.get('strand'),
                type:   from_feature.get('type')
            },
            parent: new_transcript
        });
        var subfeatures = new_transcript.get('subfeatures');
        subfeatures.push(feature);
        new_transcript.set('subfeatures', subfeatures);
        this.store.deleteFeatureById(annot.id());
        this.store.insert(new_transcript);
        this.changed();
    },

    duplicateSelectedFeatures: function() {
        var selected = this.selectionManager.getSelection();
        var selfeats = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        this.duplicateAnnotations(selfeats);
    },

    duplicateAnnotations: function(feats)  {
            var track = this;
            var featuresToAdd = new Array();
            var subfeaturesToAdd = new Array();
            var parentFeature;
            for( var i in feats )  {
                    var feat = feats[i];
                    var is_subfeature = !! feat.parent() ;  // !! is shorthand for returning true if value is defined and non-null
                    if (is_subfeature) {
                            subfeaturesToAdd.push(feat);
                    }
                    else {
                            featuresToAdd.push( JSONUtils.createApolloFeature( feat, "transcript") );
                    }
            }
            if (subfeaturesToAdd.length > 0) {
                    var feature = new SimpleFeature();
                    var subfeatures = new Array();
                    feature.set( 'subfeatures', subfeatures );
                    var fmin = undefined;
                    var fmax = undefined;
                    var strand = undefined;
                    for (var i = 0; i < subfeaturesToAdd.length; ++i) {
                            var subfeature = subfeaturesToAdd[i];
                            if (fmin === undefined || subfeature.get('start') < fmin) {
                                    fmin = subfeature.get('start');
                            }
                            if (fmax === undefined || subfeature.get('end') > fmax) {
                                    fmax = subfeature.get('end');
                            }
                            if (strand === undefined) {
                                    strand = subfeature.get('strand');
                            }
                            subfeatures.push(subfeature);
                    }
                    feature.set('start', fmin );
                    feature.set('end', fmax );
                    feature.set('strand', strand );
                    featuresToAdd.push( JSONUtils.createApolloFeature( feature, "transcript") );
            }
            var postData = '{ "track": "' + track.getUniqueTrackName() + '", "features": ' + JSON.stringify(featuresToAdd) + ', "operation": "add_transcript" }';
            track.executeUpdateOperation(postData);
    },

    /**
     *  If there are multiple EditTracks, each has a separate FeatureSelectionManager
     *    (contrasted with DraggableFeatureTracks, which all share the same selection and selection manager
     */
    deleteSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.deleteAnnotations(selected);
    },

    deleteAnnotations: function(records) {
        var track = this;
        var features = '"features": [';
        var uniqueNames = [];
        for (var i in records)  {
	    var record = records[i];
	    var selfeat = record.feature;
	    var seltrack = record.track;
            var uniqueName = selfeat.id();
            // just checking to ensure that all features in selection are from this track --
            //   if not, then don't try and delete them
            if (seltrack === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
                uniqueNames.push(uniqueName);
            }
        }
        features += ']';
        var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "delete_feature" }';
        track.executeUpdateOperation(postData);
    }, 

    mergeSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.mergeAnnotations(selected);
    },

    mergeAnnotations: function(selection) {
        var track = this;
        var annots = []; 
        for (var i=0; i<selection.length; i++)  { 
        	annots[i] = selection[i].feature; 
        }

        var sortedAnnots = track.sortAnnotationsByLocation(annots);
        var leftAnnot = sortedAnnots[0];
        var rightAnnot = sortedAnnots[sortedAnnots.length - 1];
        var trackName = this.getUniqueTrackName();

        /*
        for (var i in annots)  {
            var annot = annots[i];
            // just checking to ensure that all features in selection are from this track --
            //   if not, then don't try and delete them
            if (annot.track === track)  {
                var trackName = track.getUniqueTrackName();
                if (leftAnnot == null || annot[track.fields["start"]] < leftAnnot[track.fields["start"]]) {
                    leftAnnot = annot;
                }
                if (rightAnnot == null || annot[track.fields["end"]] > rightAnnot[track.fields["end"]]) {
                    rightAnnot = annot;
                }
            }
        }
        */

        var features;
        var operation;
        // merge exons
        if (leftAnnot.parent() && rightAnnot.parent() && leftAnnot.parent() == rightAnnot.parent()) {
            features = '"features": [ { "uniquename": "' + leftAnnot.id() + '" }, { "uniquename": "' + rightAnnot.id() + '" } ]';
            operation = "merge_exons";
        }
        // merge transcripts
        else {
            var leftTranscriptId = leftAnnot.parent() ? leftAnnot.parent().id() : leftAnnot.id();
            var rightTranscriptId = rightAnnot.parent() ? rightAnnot.parent().id() : rightAnnot.id();
            features = '"features": [ { "uniquename": "' + leftTranscriptId + '" }, { "uniquename": "' + rightTranscriptId + '" } ]';
            operation = "merge_transcripts";
        }
        var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
        track.executeUpdateOperation(postData);
    },

    splitSelectedFeatures: function(event)  {
        // var selected = this.selectionManager.getSelection();
	var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        this.splitAnnotations(selected, event);
    },

    splitAnnotations: function(annots, event) {
        // can only split on max two elements
        if( annots.length > 2 ) {
            return;
        }
        var track = this;
        var sortedAnnots = track.sortAnnotationsByLocation(annots);
        var leftAnnot = sortedAnnots[0];
        var rightAnnot = sortedAnnots[sortedAnnots.length - 1];
        var trackName = track.getUniqueTrackName();

        /*
        for (var i in annots)  {
            var annot = annots[i];
            // just checking to ensure that all features in selection are from this track --
            //   if not, then don't try and delete them
            if (annot.track === track)  {
                var trackName = track.getUniqueTrackName();
                if (leftAnnot == null || annot[track.fields["start"]] < leftAnnot[track.fields["start"]]) {
                    leftAnnot = annot;
                }
                if (rightAnnot == null || annot[track.fields["end"]] > rightAnnot[track.fields["end"]]) {
                    rightAnnot = annot;
                }
            }
        }
        */
        var features;
        var operation;
        // split exon
        if (leftAnnot == rightAnnot) {
            var coordinate = this.getGenomeCoord(event);
            features = '"features": [ { "uniquename": "' + leftAnnot.id() + '", "location": { "fmax": ' + coordinate + ', "fmin": ' + (coordinate + 1) + ' } } ]';
            operation = "split_exon";
        }
        // split transcript
        else if (leftAnnot.parent() == rightAnnot.parent()) {
            features = '"features": [ { "uniquename": "' + leftAnnot.id() + '" }, { "uniquename": "' + rightAnnot.id() + '" } ]';
            operation = "split_transcript";
        }
        else {
            return;
        }
        var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
        track.executeUpdateOperation(postData);
    },

    makeIntron: function(event)  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.makeIntronInExon(selected, event);
    },

    makeIntronInExon: function(records, event) {
        if (records.length > 1) {
            return;
        }
        var track = this;
        var annot = records[0].feature;
        var coordinate = this.getGenomeCoord(event);
        var features = '"features": [ { "uniquename": "' + annot.id() + '", "location": { "fmin": ' + coordinate + ' } } ]';
        var operation = "make_intron";
        var trackName = track.getUniqueTrackName();
        var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
        track.executeUpdateOperation(postData);
    },

    setTranslationStart: function(event)  {
        // var selected = this.selectionManager.getSelection();
	var selfeats = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        this.setTranslationStartInCDS(selfeats, event);
    },

    setTranslationStartInCDS: function(annots, event) {
    	if (annots.length > 1) {
    		return;
    	}
    	var track = this;
    	var annot = annots[0];
    	// var coordinate = this.gview.getGenomeCoord(event);
//  	var coordinate = Math.floor(this.gview.absXtoBp(event.pageX));
    	var coordinate = this.getGenomeCoord(event);
    	console.log("called setTranslationStartInCDS to: " + coordinate);

    	var uid = annot.parent() ? annot.parent().id() : annot.id();
    	var features = '"features": [ { "uniquename": "' + uid + '", "location": { "fmin": ' + coordinate + ' } } ]';
    	var operation = "set_translation_start";
    	var trackName = track.getUniqueTrackName();
    	var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
    	track.executeUpdateOperation(postData);
    },

    flipStrand: function()  {
        var selected = this.selectionManager.getSelection();
        this.flipStrandForSelectedFeatures(selected);
    },

    flipStrandForSelectedFeatures: function(records) {
        var track = this;
        var uniqueNames = new Object();
        for (var i in records)  {
	    var record = records[i];
	    var selfeat = record.feature;
	    var seltrack = record.track;
            var topfeat = EditTrack.getTopLevelAnnotation(selfeat);
            var uniqueName = topfeat.id();
            // just checking to ensure that all features in selection are from this track
            if (seltrack === track)  {
                    uniqueNames[uniqueName] = 1;
            }
        }
        var features = '"features": [';
        var i = 0;
        for (var uniqueName in uniqueNames) {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
                ++i;
        }
        features += ']';
        var operation = "flip_strand";
        var trackName = track.getUniqueTrackName();
        var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
        track.executeUpdateOperation(postData);
    },

    setLongestORF: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.setLongestORFForSelectedFeatures(selected);
    },

    setLongestORFForSelectedFeatures: function(selection) {
        var track = this;
        var features = '"features": [';
        for (var i in selection)  {
            var annot = EditTrack.getTopLevelAnnotation(selection[i].feature);
	    var atrack = selection[i].track;
            var uniqueName = annot.id();
            // just checking to ensure that all features in selection are from this track
            if (atrack === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
            }
        }
        features += ']';
        var operation = "set_longest_orf";
        var trackName = track.getUniqueTrackName();
        var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
        track.executeUpdateOperation(postData);
    },

    getSequence: function()  {
        var selected = this.selectionManager.getSelection();
        this.getSequenceForSelectedFeatures(selected);
    },

    getSequenceForSelectedFeatures: function(records) {
    },

    searchSequence: function() {
        var track = this;
        var starts = new Object();
        var browser = track.gview.browser;
        for (i in browser.allRefs) {
            var refSeq = browser.allRefs[i];
            starts[refSeq.name] = refSeq.start;
        }
        var search = new SequenceSearch(context_path);
        search.setRedirectCallback(function(id, fmin, fmax) {
            var loc = id + ":" + fmin + "-" + fmax;
            if (id == track.refSeq.name) {
                track.gview.browser.navigateTo(loc);
                track.popupDialog.hide();
            }
            else {
                var url = window.location.toString().replace(/loc=.+/, "loc=" + loc);
                window.location.replace(url);
            }
        });
        search.setErrorCallback(function(response) {
            track.handleError(response);
        });
        var content = search.searchSequence(track.getUniqueTrackName(), track.refSeq.name, starts);
        if (content) {
            this.openDialog("Search sequence", content);
        }
    },

    zoomToBaseLevel: function(event) {
        var coordinate = this.getGenomeCoord(event);
        this.gview.zoomToBaseLevel(event, coordinate);
    },

    zoomBackOut: function(event) {
        this.gview.zoomBackOut(event);
    },

    handleError: function(response) {
        console.log("ERROR: ");
        console.log(response);  // in Firebug, allows retrieval of stack trace, jump to code, etc.
        console.log(response.stack);
        var error = eval('(' + response.responseText + ')');
        //      var error = response.error ? response : eval('(' + response.responseText + ')');
        if (error && error.error) {
            alert(error.error);
		return false;
        }
    },

    handleConfirm: function(response) {
            return confirm(response); 
    },

    getUniqueTrackName: function() {
        return this.name + "-" + this.refSeq.name;
    },

    openDialog: function(title, data) {
        this.popupDialog.set("title", title);
        this.popupDialog.set("content", data);
        this.popupDialog.show();
        this.popupDialog.placeAt("GenomeBrowser", "first");
    },

    updateMenu: function() {
        this.updateSetTranslationStartMenuItem();
        this.updateMergeMenuItem();
        this.updateSplitMenuItem();
        this.updateMakeIntronMenuItem();
        this.updateFlipStrandMenuItem();
        this.updateEditCommentsMenuItem();
        this.updateEditDbxrefsMenuItem();
        this.updateUndoMenuItem();
        this.updateRedoMenuItem();
        this.updateZoomToBaseLevelMenuItem();
        this.updateDuplicateMenuItem();
    },

    updateSetTranslationStartMenuItem: function() {
        var menuItem = this.getMenuItem("set_translation_start");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
        var selectedFeat = selected[0].feature;
        if (selectedFeat.parent()) {
            selectedFeat = selectedFeat.parent();
        }
        if (selectedFeat.get('manuallySetTranslationStart')) {
            menuItem.set("label", "Unset translation start");
        }
        else {
            menuItem.set("label", "Set translation start");
        }
    },

    updateMergeMenuItem: function() {
        var menuItem = this.getMenuItem("merge");
        var selected = this.selectionManager.getSelection();
        if (selected.length < 2) {
            menuItem.set("disabled", true);
            // menuItem.domNode.style.display = "none";  // direct method for hiding menuitem
            // $(menuItem.domNode).hide();   // probably better method for hiding menuitem
            return;
        }
        else  {
            // menuItem.domNode.style.display = "";  // direct method for unhiding menuitem
            // $(menuItem.domNode).show();  // probably better method for unhiding menuitem
        }
        var strand = selected[0].feature.get('strand');
        for (var i = 1; i < selected.length; ++i) {
            if (selected[i].feature.get('strand') != strand) {
                    menuItem.set("disabled", true);
                    return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateSplitMenuItem: function() {
        var menuItem = this.getMenuItem("split");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 2) {
            menuItem.set("disabled", true);
            return;
        }
        var parent = selected[0].feature.parent();
        for (var i = 1; i < selected.length; ++i) {
            if (selected[i].feature.parent() != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateMakeIntronMenuItem: function() {
        var menuItem = this.getMenuItem("make_intron");
        var selected = this.selectionManager.getSelection();
        if( selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
    },

    updateFlipStrandMenuItem: function() {
        var menuItem = this.getMenuItem("flip_strand");
    },

    updateEditCommentsMenuItem: function() {
        var menuItem = this.getMenuItem("edit_comments");
        var selected = this.selectionManager.getSelection();
        var parent = EditTrack.getTopLevelAnnotation(selected[0].feature);
        for (var i = 1; i < selected.length; ++i) {
            if (EditTrack.getTopLevelAnnotation(selected[i].feature) != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateEditDbxrefsMenuItem: function() {
        var menuItem = this.getMenuItem("edit_dbxrefs");
        var selected = this.selectionManager.getSelection();
        var parent = EditTrack.getTopLevelAnnotation(selected[0].feature);
        for (var i = 1; i < selected.length; ++i) {
            if (EditTrack.getTopLevelAnnotation(selected[i].feature) != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateUndoMenuItem: function() {
        var menuItem = this.getMenuItem("undo");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
    },

    updateRedoMenuItem: function() {
        var menuItem = this.getMenuItem("redo");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
    },


    updateHistoryMenuItem: function() {
	var menuItem = this.getMenuItem("history");
	var selected = this.selectionManager.getSelection();
	if (selected.length > 1) {
    	    menuItem.set("disabled", true);
    	    return;
	}
	menuItem.set("disabled", false);
    }, 

    updateZoomToBaseLevelMenuItem: function() {
        var menuItem = this.getMenuItem("zoom_to_base_level");
        if( !this.gview.isZoomedToBase() ) {
            menuItem.set("label", "Zoom to base level");
        }
        else {
            menuItem.set("label", "Zoom back out");
        }
    },

    updateDuplicateMenuItem: function() {
        var menuItem = this.getMenuItem("duplicate");
        var selected = this.selectionManager.getSelection();
        var parent = EditTrack.getTopLevelAnnotation(selected[0].feature);
        for (var i = 1; i < selected.length; ++i) {
            if (EditTrack.getTopLevelAnnotation(selected[i].feature) != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    sortAnnotationsByLocation: function(annots) {
        var track = this;
        return annots.sort(function(annot1, annot2) {
                               var start1 = annot1.get("start");
                               var end1 = annot1.get("end");
                               var start2 = annot2.get("start");
                               var end2 = annot2.get('end');

                               if (start1 != start2)  { return start1 - start2; }
                               else if (end1 != end2) { return end1 - end2; }
                               else                   { return 0; }
                           });
    },

    /**
     * handles adding overlay of sequence residues to "row" of selected feature
     *   (also handled in similar manner in fillBlock());
     * WARNING:
     *    this _requires_ browser support for pointer-events CSS property,
     *    (currently supported by Firefox 3.6+, Chrome 4.0+, Safari 4.0+)
     *    (Exploring possible workarounds for IE, for example see:
     *        http://www.vinylfox.com/forwarding-mouse-events-through-layers/
     *        http://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements
     *            [ see section on CSS conditional statement workaround for IE ]
     *    )
     *    and must set "pointer-events: none" in CSS rule for div.annot-sequence
     *    otherwise, since sequence overlay is rendered on top of selected features
     *        (and is a sibling of feature divs), events intended for feature divs will
     *        get caught by overlay and not make it to the feature divs
     */
    selectionAdded: function( rec, smanager)  {
        var feat = rec.feature;
        this.inherited( arguments );

        var track = this;

	// switched to only have most recent selected annot have residues overlay if zoomed to base level, 
	//    rather than all selected annots
	// therefore want to revove all prior residues overlay divs
        if (rec.track === track)  {
            // remove sequence text nodes
            $("div.annot-sequence", track.div).remove();
        }

        // want to get child of block, since want position relative to block
        // so get top-level feature div (assumes top level feature is always rendered...)
        var topfeat = EditTrack.getTopLevelAnnotation(feat);
        var featdiv = track.getFeatDiv(topfeat);
	if (featdiv)  {
	    var strand = topfeat.get('strand');
            var selectionYPosition = $(featdiv).position().top;
            var scale = track.gview.bpToPx(1);
            var charSize = track.browser.getSequenceCharacterSize();
            if (scale === charSize.width && track.useResiduesOverlay)  {
                var seqTrack = this.getSequenceTrack();
                for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
                    var block = this.blocks[bindex];
		    // seqTrack.getRange(block.startBase, block.endBase,
                    //  seqTrack.sequenceStore.getRange(this.refSeq, block.startBase, block.endBase,
		    seqTrack.sequenceStore.getFeatures({ ref: this.refSeq.name, start: block.startBase, end: block.endBase },
	                    function(feat) {
				var start = feat.get('start');
				var end   = feat.get('end');
				var seq   = feat.get('seq');
			    
                            // var ypos = $(topfeat).position().top;
                            // +2 hardwired adjustment to center (should be calc'd based on feature div dims?
                            var ypos = selectionYPosition + 2;
                            // checking to see if residues for this "row" of the block are already present
                            //    ( either from another selection in same row, or previous rendering
                            //        of same selection [which often happens when scrolling] )
                            // trying to avoid duplication both for efficiency and because re-rendering of text can
                            //    be slighly off from previous rendering, leading to bold / blurry text when overlaid

                            var $seqdivs = $("div.annot-sequence", block);
                            var sindex = $seqdivs.length;
                            var add_residues = true;
                            if ($seqdivs && sindex > 0)  {
                                for (var i=0; i<sindex; i++) {
                                    var sdiv = $seqdivs[i];
                                    if ($(sdiv).position().top === ypos)  {
                                        // console.log("residues already present in block: " + bindex);
                                        add_residues = false;
                                    }
                                }
                            }
                            if (add_residues)  {
                                var seqNode = document.createElement("div");
                                seqNode.className = "annot-sequence";
				if (strand == '-' || strand == -1)  {
				    // seq = track.reverseComplement(seq);
				    seq = track.getSequenceTrack().complement(seq);
				}
                                seqNode.appendChild(document.createTextNode(seq));
                                // console.log("ypos: " + ypos);
                                seqNode.style.cssText = "top: " + ypos + "px;";
                                block.appendChild(seqNode);
                                if (track.FADEIN_RESIDUES)  {
                                    $(seqNode).hide();
                                    $(seqNode).fadeIn(1500);
                                }
                            }
                        } );

                }
            }
        }

    },

    selectionRemoved: function(selected_record, smanager)  {
	this.inherited( arguments );
	var track = this;
	if (selected_record.track === track)  {
	    var feat = selected_record.feature;
	    var featdiv = this.getFeatDiv(feat);
	    // remove sequence text nodes
	    // console.log("removing base residued text from selected annot");
	    $("div.annot-sequence", track.div).remove();
	}
    }, 

    startZoom: function(destScale, destStart, destEnd) {
        // would prefer to only try and hide dna residues on zoom if previous scale was at base pair resolution
        //   (otherwise there are no residues to hide), but by time startZoom is called, pxPerBp is already set to destScale,
        //    so would require keeping prevScale var around, or passing in prevScale as additional parameter to startZoom()
        // so for now just always trying to hide residues on a zoom, whether they're present or not

        this.inherited( arguments );

        var selected = this.selectionManager.getSelection();
        if( selected.length > 0 ) {
            // if selected annotations, then hide residues overlay
            //     (in case zoomed in to base pair resolution and the residues overlay is being displayed)
            $(".annot-sequence", this.div).css('display', 'none');
        }
    },

    executeUpdateOperation: function(postData, loadCallback) {
    }
});

EditTrack.getTopLevelAnnotation = function(annotation) {
    while( annotation.parent() ) {
        annotation = annotation.parent();
    }
    return annotation;
};

return EditTrack;
});

/*
  Copyright (c) 2010-2011 Berkeley Bioinformatics Open Projects (BBOP)

  This package and its accompanying libraries are free software; you can
  redistribute it and/or modify it under the terms of the LGPL (either
  version 2.1, or at your option, any later version) or the Artistic
  License 2.0.  Refer to LICENSE for the full license text.

*/