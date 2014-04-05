define([
            'dojo/_base/declare',
            'jquery',
            'underscore',
            'jqueryui/droppable',
            'jqueryui/resizable',
            'contextmenu',
            'JBrowse/View/Track/DraggableHTMLFeatures',
            'JBrowse/FeatureSelectionManager',
            'JBrowse/BioFeatureUtils',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util',
            'JBrowse/View/GranularRectLayout',
            'bionode'
        ],
        function(declare,
                 $,
                 _,
                 droppable,
                 resizable,
                 contextmenu,
                 DraggableFeatureTrack,
                 FeatureSelectionManager,
                 BioFeatureUtils,
                 SimpleFeature,
                 Util,
                 Layout,
                 Bionode) {

var EditTrack = declare(DraggableFeatureTrack,
{
    constructor: function( args ) {
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

        this.sequenceTrack = this.browser.getSequenceTrack();
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

    /**
     *  overriding renderFeature to add event handling right-click context menu
     */
    renderFeature:  function (feature, uniqueId, block, scale, labelScale, descriptionScale, containerStart, containerEnd) {
        var featDiv = this.inherited( arguments );
        var track = this;

        if (featDiv && featDiv != null)  {
            $(featDiv).contextmenu({
                target: '#contextmenu'
            })
        }
        return featDiv;
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
                var charSize = this.sequenceTrack.getCharacterMeasurements();
                if (scale === charSize.width) { gridvals = [track.gview.charWidth, 1]; }
                else  { gridvals = false; }

                $(featdiv).resizable({
                    handles: "e, w",
                    helper: "ui-resizable-helper",
                    autohide: false,
                    grid: gridvals,

                    stop: function(event, ui)  {
                        var exon      = ui.originalElement[0].subfeature;
                        var parent    = exon.parent();
                        var children  = parent.children();
                        var exonIndex = _.indexOf(children, exon);
                        var leftExon  = _.find(children.slice().reverse(), function (f) {
                            return f.get('end') < exon.get('start') && f.get('type') === 'exon';
                        });
                        var rightExon = _.find(children, function (f) {
                            return f.get('start') > exon.get('end') && f.get('type') === 'exon';
                        });

                        var leftDeltaPixels  = ui.position.left - ui.originalPosition.left;
                        var rightDeltaPixels = ui.position.left + ui.size.width - ui.originalPosition.left - ui.originalSize.width;
                        var leftDeltaBases   = Math.round(track.gview.pxToBp(leftDeltaPixels));
                        var rightDeltaBases  = Math.round(track.gview.pxToBp(rightDeltaPixels));

                        if (leftExon && (exon.get('start') + leftDeltaBases) <= leftExon.get('end')) {
                            track.mergeExons(parent, leftExon, exon);
                        }
                        else if (rightExon && (exon.get('end') + rightDeltaBases) >= rightExon.get('start')) {
                            track.mergeExons(parent, exon, rightExon);
                        }
                        else {
                            track.resizeExon(parent, exonIndex, leftDeltaBases, rightDeltaBases);
                        }
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
        var track = this;
        $(this.div).droppable(  {
            accept: ".selected-feature",
            drop: function(event, ui)  {
                var features = track.browser.featSelectionManager.getSelectedFeatures();
                for (var i in features)  {
                    var top_level_feature = !features[i].parent();
                    if (top_level_feature) {
                        track.addTranscript(features[i]);
                    }
                    else {
                        track.addExon(features[i]);
                    }
                }
            }
        });
    },

    addTranscript: function (transcript) {
        var new_transcript = this.newTranscript(transcript);
        this.markNonCanonicalSpliceSites(new_transcript, function () {
            this.store.insert(new_transcript);
            this.changed();
        });
    },

    addExon: function (exon) {
        // When an exon is dragged to the edit track, we need to copy the
        // underlying CDS feature to the edit track as well.
        var features_to_add = _.select(exon.parent().children(), function (f) {
            if (f.get('start') >= exon.get('start') &&
                f.get('end') <= exon.get('end')) {
                return f;
            }
        });
        features_to_add_sorted =
            this.sortAnnotationsByLocation(features_to_add);

        var new_transcript = new SimpleFeature({
            data: {
                name:  features_to_add_sorted[0].get('name'),
                ref:   features_to_add_sorted[0].get('ref'),
                start: features_to_add_sorted[0].get('start'),
                end:   features_to_add_sorted[features_to_add_sorted.length - 1].get('end'),
                strand: features_to_add_sorted[0].get('strand')
            }
        });
        var subfeatures = _.map(features_to_add_sorted, function (f) {
            return new SimpleFeature({
                data: {
                    name:  f.get('name'),
                    ref:   f.get('ref'),
                    start: f.get('start'),
                    end:   f.get('end'),
                    type:  f.get('type'),
                    strand: f.get('strand')
                },
                parent: new_transcript
            });
        });
        new_transcript.set('subfeatures', subfeatures);
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

        this.markNonCanonicalSpliceSites(new_transcript, function () {
            this.store.replace(new_transcript);
            this.changed();
        });

        var featdiv = this.getFeatDiv(exon);
        $(featdiv).trigger('mousedown');
    },

    mergeExons: function(transcript, leftExon, rightExon) {
        var new_transcript = new SimpleFeature({
            id:   transcript.id(),
            data: {
                name:   transcript.get('name'),
                ref:    transcript.get('seq_id') || transcript.get('ref'),
                start:  transcript.get('start'),
                end:    transcript.get('end'),
                strand: transcript.get('strand')
            }
        });
        var subfeatures = _.reject(transcript.children(), function (f) {
            return f.id() == leftExon.id() || f.id() == rightExon.id();
        });
        var new_exon    = new SimpleFeature({
            data: {
                start: leftExon.get('start'),
                end:   rightExon.get('end'),
                strand: leftExon.get('strand'),
                type:   leftExon.get('type')
            },
            parent: new_transcript
        });
        subfeatures.push(new_exon);
        subfeatures = this.sortAnnotationsByLocation(subfeatures);
        new_transcript.set('subfeatures', subfeatures);
        this.store.replace(new_transcript);
        this.changed();
        var featdiv = this.getFeatDiv(new_exon);
        $(featdiv).trigger('mousedown');
    },

    newTranscript: function (from, reuse_id)  {
        if (reuse_id === undefined)
            reuse_id = true;

        var feature = new SimpleFeature({
            id:   reuse_id ? from.id() : undefined,
            data: {
                name:   from.get('name'),
                ref:    from.get('seq_id') || from.get('ref'),
                start:  from.get('start'),
                end:    from.get('end'),
                strand: from.get('strand')
            }
        });

        var from_subfeatures = from.get('subfeatures');
        //console.log(from);
        //console.log(from_subfeatures);

        if (from_subfeatures) {
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
        }
        //console.log(feature);
        return feature;
    },

    duplicateSelectedFeatures: function() {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        this.duplicateFeatures(selected);
    },

    duplicateFeatures: function(feats)  {
            var subfeaturesToAdd = [];
            var parentFeature;
            for( var i in feats )  {
                    var feat = feats[i];
                    var is_subfeature = !! feat.parent() ;  // !! is shorthand for returning true if value is defined and non-null
                    if (is_subfeature) {
                            subfeaturesToAdd = subfeaturesToAdd.concat(_.select(feat.parent().children(), function (f) {
                                return (f.get('start') >= feat.get('start') && f.get('end') <= feat.get('end'));
                            }));
                    }
                    else {
                        var new_transcript = this.newTranscript(feats[i], false);
                        this.store.insert(new_transcript);
                        this.changed();
                    }
            }
            if (subfeaturesToAdd.length > 0) {
                    var feature = new SimpleFeature();
                    var subfeatures = new Array();
                    feature.set('subfeatures', subfeatures );
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
                            subfeatures.push(new SimpleFeature({
                                data: {
                                    start:  subfeature.get('start'),
                                    end:    subfeature.get('end'),
                                    strand: subfeature.get('strand'),
                                    type:   subfeature.get('type')
                                },
                                parent: feature
                            }));
                    }
                    feature.set('start', fmin );
                    feature.set('end', fmax );
                    feature.set('strand', strand );
                    this.store.insert(feature);
                    this.changed();
            }
    },

    deleteSelectedFeatures: function () {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        this.deleteFeatures(selected);
    },

    deleteFeatures: function(selection)  {
        for (var i in selection) {
            var feature = selection[i];
            var parent = feature.parent();

            if (parent) {
                var new_transcript = new SimpleFeature({
                    id:   parent.id(),
                    data: {
                        name:   parent.get('name'),
                        ref:    parent.get('seq_id') || parent.get('ref'),
                        start:  parent.get('start'),
                        end:    parent.get('end'),
                        strand: parent.get('strand')
                    }
                });
                // delete selected exon from parent
                var subfeatures = _.reject(parent.get('subfeatures'), function (f) {
                    return f.id() == feature.id();
                });
                new_transcript.set('subfeatures', subfeatures);
                this.store.replace(new_transcript);
                this.changed();
            }
            else {
                // delete transcript
                this.store.deleteFeatureById(feature.id());
                this.changed();
            }
        }
    },

    mergeSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelectedFeatures();
        var sortedAnnots = this.sortAnnotationsByLocation(selected);
        var leftAnnot = sortedAnnots[0];
        var rightAnnot = sortedAnnots[sortedAnnots.length - 1];
        //var trackName = this.getUniqueTrackName();

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

        if (leftAnnot.parent() && rightAnnot.parent() && leftAnnot.parent() == rightAnnot.parent()) {
            this.mergeExons(leftAnnot.parent(), leftAnnot, rightAnnot);
        }
        else {
            this.mergeTranscripts(leftAnnot, rightAnnot);
        }
        this.selectionManager.clearSelection();
    },

    mergeTranscripts: function(leftTranscript, rightTranscript) {
        if (leftTranscript.parent())
            leftTranscript = leftTranscript.parent();

        if (rightTranscript.parent())
            rightTranscript = rightTranscript.parent();

        var new_transcript = new SimpleFeature({
            data: {
                name: leftTranscript.get('name'),
                ref:  leftTranscript.get('ref'),
                start: leftTranscript.get('start'),
                end:   rightTranscript.get('end'),
                strand: leftTranscript.get('strand'),
                type:   leftTranscript.get('type')
            }
        });
        var subfeatures = leftTranscript.children();
        subfeatures = subfeatures.concat(rightTranscript.children());
        new_transcript.set('subfeatures', subfeatures);
        this.markNonCanonicalSpliceSites(new_transcript, function () {
            this.store.deleteFeatureById(leftTranscript.id());
            this.store.deleteFeatureById(rightTranscript.id());
            this.store.insert(new_transcript);
            this.changed();
        });
    },

    splitSelectedTranscript: function ()  {
        var transcript = this.selectionManager.getSelectedFeatures()[0];
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        this.splitTranscript(transcript, coordinate);
        this.selectionManager.clearSelection();
    },

    makeIntronInSelectedExon: function () {
        var exon = this.selectionManager.getSelectedFeatures()[0];
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        this.makeIntron(exon.parent(), exon, coordinate);
        this.selectionManager.clearSelection();
    },

    makeIntron: function(transcript, exon, coordinate) {
        var feature = new SimpleFeature({
            id:   transcript.id(),
            data: {
                name:   transcript.get('name'),
                ref:    transcript.get('seq_id') || transcript.get('ref'),
                start:  transcript.get('start'),
                end:    transcript.get('end'),
                strand: transcript.get('strand')
            }
        });
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.id() == exon.id();
        });
        subfeatures.push(new SimpleFeature({
            data: {
                start:  exon.get('start'),
                end:    coordinate - 10,
                strand: exon.get('strand'),
                type:   exon.get('type')
            },
            parent: feature
        }));
        subfeatures.push(new SimpleFeature({
            data: {
                start:  coordinate + 10,
                end:    exon.get('end'),
                strand: exon.get('strand'),
                type:   exon.get('type')
            },
            parent: feature
        }));
        subfeatures = this.sortAnnotationsByLocation(subfeatures);
        feature.set('subfeatures', subfeatures);
        this.store.replace(feature);
        this.changed();
    },

    splitTranscript: function (transcript, coordinate) {
        var children  = transcript.children();
        var leftExon  = _.find(children.slice().reverse(), function (f) {
            return f.get('end') < coordinate && f.get('type') === 'exon';
        });
        var rightExon = _.find(children, function (f) {
            return f.get('start') > coordinate && f.get('type') === 'exon';
        });
        var feature1 = new SimpleFeature({
            data: {
                name:   transcript.get('name'),
                ref:    transcript.get('seq_id') || transcript.get('ref'),
                start:  transcript.get('start'),
                end:    leftExon.get('end'),
                strand: transcript.get('strand')
            }
        });
        var feature2 = new SimpleFeature({
            data: {
                name:   transcript.get('name'),
                ref:    transcript.get('seq_id') || transcript.get('ref'),
                start:  rightExon.get('start'),
                end:    transcript.get('end'),
                strand: transcript.get('strand')
            }
        });
        var splitPoint   = false;
        var subfeatures1 = [];
        var subfeatures2 = [];
        _.each(children, function (f) {
            if (f.id() == rightExon.id())
                splitPoint = true;
            if (!splitPoint)
                subfeatures1.push(f)
            else
                subfeatures2.push(f);
        });
        feature1.set('subfeatures', subfeatures1);
        feature2.set('subfeatures', subfeatures2);
        this.store.deleteFeatureById(transcript.id());
        this.store.insert(feature1);
        this.store.insert(feature2);
        this.changed();
    },

    setTranslationStart: function(event)  {
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
    	var coordinate = this.getGenomeCoord(event);
    	console.log("called setTranslationStartInCDS to: " + coordinate);

    	var uid = annot.parent() ? annot.parent().id() : annot.id();
    	var features = '"features": [ { "uniquename": "' + uid + '", "location": { "fmin": ' + coordinate + ' } } ]';
    	var operation = "set_translation_start";
    	var trackName = track.getUniqueTrackName();
    	var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
    	track.executeUpdateOperation(postData);
    },

    flipStrandForSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelectedFeatures();
        this.flipStrand(selected);
    },

    flipStrand: function(features) {
        for (var i in features)  {
            var feature  = features[i];
            if (feature.parent()) {
                // can't flips strand for subfeatures
                return;
            }

            var new_transcript = new SimpleFeature({
                id:   feature.id(),
                data: {
                    name:   feature.get('name'),
                    ref:    feature.get('seq_id') || feature.get('ref'),
                    start:  feature.get('start'),
                    end:    feature.get('end'),
                    strand: feature.get('strand') * -1,
                    type:   feature.get('type')
                }
            });
            var subfeatures = _.map(feature.children(), function (f) {
                return new SimpleFeature({
                    data: {
                        name:   f.get('name'),
                        ref:    f.get('seq_id') || feature.get('ref'),
                        start:  f.get('start'),
                        end:    f.get('end'),
                        strand: f.get('strand') * -1,
                        type:   f.get('type')
                    }
                });
            });
            new_transcript.set('subfeatures', subfeatures);
            this.store.replace(new_transcript);
            this.changed();
        }
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

    markNonCanonicalSpliceSites: function (feature, callback) {
        var track = this;
        this.browser.getStore('refseqs', dojo.hitch(this, function(refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: this.refSeq.name, start: feature.get('start'), end: feature.get('end')},
                    dojo.hitch(this, function (f) {
                        var seq = f.get('seq');
                        var start = f.get('start')
                        //var subfeatures = feature.get('subfeatures');
                        var cds_ranges  = [];

                        // remove non-canonical splice sites from before
                        var subfeatures = _.reject(feature.get('subfeatures'), function (f) {
                            return f.get('type') == 'non_canonical_splice_site';
                        });

                        for (var i = 0; i < subfeatures.length; i++) {
                            var subfeature = subfeatures[i];
                            if (subfeature.get('type') == 'exon') {
                                cds_ranges.push([subfeature.get('start') - start, subfeature.get('end') - start]);
                            }
                        }
                        var strand = feature.get('strand')
                        var nonCanonicalSpliceSites;
                        if (strand === 1) {
                            nonCanonicalSpliceSites = Bionode.findNonCanonicalSplices(seq, cds_ranges);
                        }
                        else if (strand === -1) {
                            nonCanonicalSpliceSites = Bionode.findNonCanonicalSplices(Util.reverseComplement(seq), Bionode.reverseExons(cds_ranges, seq.length));
                            for (var i = 0; i < nonCanonicalSpliceSites.length; i++)
                                nonCanonicalSpliceSites[i] = seq.length - nonCanonicalSpliceSites[i];
                        }
                        for (var i = 0; i < nonCanonicalSpliceSites.length; i++) {
                            var non_canonical_splice_site = nonCanonicalSpliceSites[i];
                            subfeatures.push(new SimpleFeature({
                                data: {
                                    start: non_canonical_splice_site + start,
                                    end:   non_canonical_splice_site + start + 1,
                                    type:  'non_canonical_splice_site'
                                },
                                parent: feature
                            }));
                        }
                        track.sortAnnotationsByLocation(subfeatures);
                        feature.set('subfeatures', subfeatures);
                        callback.apply(track, feature);
                    }));
            }
        }));
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
        //this.updateSetTranslationStartMenuItem();
        this.updateMergeMenuItem();
        this.updateSplitMenuItem();
        //this.updateMakeIntronMenuItem();
        //this.updateEditCommentsMenuItem();
        //this.updateEditDbxrefsMenuItem();
        //this.updateUndoMenuItem();
        //this.updateRedoMenuItem();
        //this.updateZoomToBaseLevelMenuItem();
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
        var menuItem = $('#contextmenu-merge');
        var selected = this.selectionManager.getSelection();
        if (selected.length < 2) {
            menuItem.addClass('disabled')
            return;
        }
        var strand = selected[0].feature.get('strand');
        for (var i = 1; i < selected.length; ++i) {
            if (selected[i].feature.get('strand') != strand) {
                    menuItem.addClass('disabled')
                    return;
            }
        }
        menuItem.removeClass('disabled');
    },

    updateSplitMenuItem: function() {
        var menuItem = $('#contextmenu-split');
        var selected = this.selectionManager.getSelection();
        if (selected.length > 2) {
            menuItem.addClass('disabled')
            return;
        }
        var parent = selected[0].feature.parent();
        for (var i = 1; i < selected.length; ++i) {
            if (selected[i].feature.parent() != parent) {
                menuItem.addClass('disabled')
                return;
            }
        }
        menuItem.removeClass('disabled');
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
        var menuItem = $('contextmenu-duplicate');
        var selected = this.selectionManager.getSelection();
        var parent = EditTrack.getTopLevelAnnotation(selected[0].feature);
        for (var i = 1; i < selected.length; ++i) {
            if (EditTrack.getTopLevelAnnotation(selected[i].feature) != parent) {
                menuItem.addClass('disabled')
                return;
            }
        }
        menuItem.removeClass('disabled')
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

    executeUpdateOperation: function(postData, loadCallback) {
    },

    selectionAdded: function (rec, smanager) {
        var feat = rec.feature;
        this.inherited( arguments );

        var track = this;

        var topfeat = EditTrack.getTopLevelAnnotation(feat);
        var featdiv = track.getFeatDiv(topfeat);
        if (featdiv)  {
            var strand = topfeat.get('strand');
            var selectionYPosition = $(featdiv).position().top;
            var scale = track.gview.bpToPx(1);
            var charSize = this.sequenceTrack.getCharacterMeasurements();
            if (scale >= charSize.w && track.useResiduesOverlay)  {
                for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
                    var block = this.blocks[bindex];
                    this.sequenceTrack.store.getFeatures(
                        {ref: this.refSeq.name, start: block.startBase, end: block.endBase},
                        function(feat) {
                            var seq = feat.get('seq');
                            var start = feat.get('start');
                            var end = feat.get('end');

                            // -2 hardwired adjustment to center
                            var ypos = selectionYPosition - 2;

                            // make a div to contain the sequences
                            var seqNode = document.createElement("div");
                            seqNode.className = "sequence";
                            seqNode.style.width = "100%";
                            seqNode.style.top = ypos + "px";

                            if (strand == '-' || strand == -1)  {
                                seq = Util.complement(seq);
                            }

                            seqNode.appendChild(track._renderSeqDiv(seq));
                            block.domNode.appendChild(seqNode);

                        });
                }
            }
        }
        this.updateMenu();
    },

    selectionRemoved: function(selected_record, smanager)  {
        this.inherited( arguments );
        var track = this;
        if (selected_record.track === track)  {
            var feat = selected_record.feature;
            var featdiv = this.getFeatDiv(feat);
            $("div.sequence", track.div).remove();
        }
        $('.ui-resizable').resizable('destroy');
    },

    startZoom: function(destScale, destStart, destEnd) {
        // would prefer to only try and hide dna residues on zoom if previous scale was at base pair resolution
        //   (otherwise there are no residues to hide), but by time startZoom is called, pxPerBp is already set to destScale,
        //    so would require keeping prevScale var around, or passing in prevScale as additional parameter to startZoom()
        // so for now just always trying to hide residues on a zoom, whether they're present or not

        this.inherited( arguments );

        // console.log("AnnotTrack.startZoom() called");
        var selected = this.selectionManager.getSelection();
        if( selected.length > 0 ) {
            // if selected annotations, then hide residues overlay
            //     (in case zoomed in to base pair resolution and the residues overlay is being displayed)
            $("div.sequence", this.div).css('display', 'none');
        }
    },

    /**
     * Given the start and end coordinates, and the sequence bases,
     * makes a div containing the sequence.
     * @private
     */
    _renderSeqDiv: function (seq) {
        var container = document.createElement('div');
        var charWidth = 100/seq.length+"%";
        for( var i=0; i < seq.length; i++ ) {
            var base = document.createElement('span');
            base.className = 'base base_'+seq.charAt([i]).toLowerCase();
            base.style.width = charWidth;
            base.innerHTML = seq.charAt(i);
            container.appendChild(base);
        }
        return container;
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
