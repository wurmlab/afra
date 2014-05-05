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
            'JBrowse/CodonTable',
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
                 CodonTable,
                 Bionode) {

var counter = 1;
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
                var charSize = this.browser.getSequenceTrack().getCharacterMeasurements();
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
                            track.resizeExon(parent, exon, leftDeltaBases, rightDeltaBases);
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
                var subfeatures = [];
                for (var i in features)  {
                    var feature = features[i];
                    if (feature.parent()) {
                        subfeatures = subfeatures.concat(
                            _.select(feature.parent().children(), function (f) {
                            if (f.get('start') >= feature.get('start') &&
                                f.get('end') <= feature.get('end')) {
                                return f;
                            }
                        }));
                    }
                    else {
                        subfeatures = subfeatures.concat(feature.get('subfeatures'));
                    }
                }
                track.addTranscript(subfeatures);
            }
        });
    },

    addTranscript: function (subfeatures) {
        var newTranscript = this.newFeature(subfeatures);
        newTranscript.set('name', 'afra-' + newTranscript.get('seq_id') + '-mRNA-' + counter++);
        this.markNonCanonicalSites(newTranscript, function () {
            this.store.insert(newTranscript);
            this.changed();
        });
    },

    resizeExon: function (transcript, exon, leftDelta, rightDelta) {
        var subfeatures = transcript.get('subfeatures');
        var exonIndex   = _.indexOf(subfeatures, exon);

        exon = this.newFeature(exon, {
            start: exon.get('start') + leftDelta,
            end:   exon.get('end') + rightDelta
        });
        subfeatures[exonIndex] = exon;

        var newTranscript = this.newFeature(subfeatures);
        this.markNonCanonicalSites(newTranscript, function () {
            this.store.deleteFeatureById(transcript.id());
            this.store.insert(newTranscript);
            this.changed();

            var resizedExon = _.find(newTranscript.get('subfeatures'), function (f) {
                return f.get('start') === exon.get('start') &&
                    f.get('end') === exon.get('end');
            });
            var featdiv = this.getFeatDiv(resizedExon);
            $(featdiv).trigger('mousedown');
        });
    },

    mergeExons: function(transcript, leftExon, rightExon) {
        var subfeatures = _.reject(transcript.children(), function (f) {
            return f.id() == leftExon.id() || f.id() == rightExon.id();
        });
        var mergedExon = this.newFeature(leftExon, {
                end: rightExon.get('end'),
            }
        );
        subfeatures.push(mergedExon);
        var newTranscript = this.newFeature(subfeatures);
        newTranscript.set('name', transcript.get('name'));
        this.markNonCanonicalSites(newTranscript, function () {
            this.store.deleteFeatureById(transcript.id());
            this.store.insert(newTranscript);
            this.changed();
            // FIXME: the code below doesn't seem to have desired effect
            var newMergedExon = _.find(newTranscript.get('subfeatures'), function (f) {
                return f.get('start') === mergedExon.get('start') &&
                    f.get('end') === mergedExon.get('end');
            });
            var featdiv = this.getFeatDiv(newMergedExon);
            $(featdiv).trigger('mousedown');
        });
    },

    duplicateSelectedFeatures: function() {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        this.duplicateFeatures(selected);
    },

    duplicateFeatures: function(feats)  {
        var subfeaturesToAdd = [];
        var parentFeature;
        for (var i in feats)  {
            var feat = feats[i];
            var is_subfeature = !!feat.parent();
            if (is_subfeature) {
                subfeaturesToAdd = subfeaturesToAdd.concat(_.select(feat.parent().children(), function (f) {
                    return (f.get('start') >= feat.get('start') && f.get('end') <= feat.get('end'));
                }));
            }
            else {
                this.addTranscript(feats[i]);
            }
        }
        if (subfeaturesToAdd.length > 0) {
            this.addTranscript(subfeaturesToAdd);
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
                var subfeatures = parent.get('subfeatures');
                var nExons = _.filter(subfeatures, function (f) {
                    f.get('type') === 'exon';
                });

                if (nExons < 2) {
                    // delete transcript
                    this.store.deleteFeatureById(parent.id());
                    this.changed();
                }
                else {
                    // delete selected exon from parent
                    var subfeatures = _.reject(parent.get('subfeatures'), function (f) {
                        return f.id() == feature.id();
                    });
                    var newTranscript = this.newFeature(subfeatures);
                    this.store.deleteFeatureById(parent.id());
                    this.store.insert(newTranscript);
                    this.changed();
                }
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

        var subfeatures =
            leftTranscript.children().concat(rightTranscript.children());
        var newTranscript = this.newFeature(subfeatures);
        newTranscript.set('name', 'afra-' + newTranscript.get('seq_id') + '-mRNA-' + counter++);
        this.markNonCanonicalSites(newTranscript, function () {
            this.store.deleteFeatureById(leftTranscript.id());
            this.store.deleteFeatureById(rightTranscript.id());
            this.store.insert(newTranscript);
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
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.id() === exon.id();
        });
        if (coordinate - 10 > exon.get('start')) {
            var leftExon  = this.newFeature(exon, {
                end:    coordinate - 10
            });
            subfeatures.push(leftExon);
        }
        if (coordinate + 10 < exon.get('end')) {
            var rightExon = this.newFeature(exon, {
                start:  coordinate + 10
            });
            subfeatures.push(rightExon);
        }
        var newTranscript = this.newFeature(subfeatures);
        newTranscript.set('name', transcript.get('name'));
        this.store.deleteFeatureById(transcript.id());
        this.store.insert(newTranscript);
        this.changed();
    },

    splitTranscript: function (transcript, coordinate) {
        var children  = transcript.children();
        var featuresOnLeft = _.select(children, function (f) {
            return f.get('end') < coordinate;
        });
        var featuresOnRight = _.select(children, function (f) {
            return f.get('start') > coordinate;
        });

        var newTranscript1 = this.newFeature(featuresOnLeft);
        newTranscript1.set('name', 'afra-' + newTranscript1.get('seq_id') + '-mRNA-' + counter++);
        var newTranscript2 = this.newFeature(featuresOnRight);
        newTranscript2.set('name', 'afra-' + newTranscript2.get('seq_id') + '-mRNA-' + counter++);
        this.store.deleteFeatureById(transcript.id());
        this.store.insert(newTranscript1);
        this.store.insert(newTranscript2);
        this.changed();
    },

    setTranslationStart: function(event)  {
        var selected = this.selectionManager.getSelectedFeatures()[0];
        var transcript = selected.parent() ? selected.parent() : selected;
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        this.selectionManager.clearSelection();
        if (transcript.get('strand') == 1) {
            this.setTranslationStartInCDS(transcript, coordinate);
        }
        else if (transcript.get('strand') == -1) {
            this.setTranslationStopInCDS(transcript, coordinate);
        }
    },

    setTranslationStop: function(event)  {
        var selected = this.selectionManager.getSelectedFeatures()[0];
        var transcript = selected.parent() ? selected.parent() : selected;
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        this.selectionManager.clearSelection();
        if (transcript.get('strand') == 1) {
            this.setTranslationStopInCDS(transcript, coordinate);
        }
        else if (transcript.get('strand') == -1) {
            this.setTranslationStartInCDS(transcript, coordinate);
        }
    },

    setTranslationStartInCDS: function(transcript, coordinate) {
        var subfeatures = transcript.get('subfeatures');
        var cds = _.find(subfeatures, function (f) {
            return f.get('type') === 'CDS' &&
                f.get('start') < coordinate &&
                f.get('end') > coordinate;
        });
        cds = this.newFeature(cds, {
            start: coordinate
        });

        // reject all cds before coordinate
        subfeatures = _.reject(subfeatures, function (f) {
            return f.get('type') === 'CDS' && f.get('start') < coordinate;
        });
        subfeatures.push(cds);
        var newTranscript = this.newFeature(subfeatures);
        this.markNonCanonicalSites(newTranscript, function () {
            this.store.deleteFeatureById(transcript.id());
            this.store.insert(newTranscript);
            this.changed();
        });
    },

    setTranslationStopInCDS: function(transcript, coordinate) {
        var subfeatures = transcript.get('subfeatures');
        var cds = _.find(subfeatures, function (f) {
            return f.get('type') === 'CDS' &&
                f.get('start') < coordinate &&
                f.get('end') > coordinate;
        });
        cds = this.newFeature(cds, {
            end: coordinate
        });

        // reject all cds before coordinate
        subfeatures = _.reject(subfeatures, function (f) {
            return f.get('type') === 'CDS' && f.get('end') > coordinate;
        });
        subfeatures.push(cds);
        var newTranscript = this.newFeature(subfeatures);
        this.markNonCanonicalSites(newTranscript, function () {
            this.store.deleteFeatureById(transcript.id());
            this.store.insert(newTranscript);
            this.changed();
        });
    },

    flipStrandForSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelectedFeatures();
        this.flipStrand(selected);
    },

    flipStrand: function(features) {
        var track = this;
        for (var i in features)  {
            var feature  = features[i];
            if (feature.parent()) {
                // can't flips strand for subfeatures
                return;
            }

            var subfeatures = _.map(feature.children(), function (f) {
                return track.newFeature(f, {
                    strand: f.get('strand') * -1,
                });
            });
            var newTranscript = this.newFeature(subfeatures);
            newTranscript.set('name', feature.get('name'));
            this.markNonCanonicalSites(newTranscript, function () {
                this.store.deleteFeatureById(feature.id());
                this.store.insert(newTranscript);
                this.changed();
            });
        }
    },

    setLongestORFForSelectedFeatures: function () {
        var selection = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        for (var i in selection)  {
            var annot = EditTrack.getTopLevelAnnotation(selection[i]);
            this.setLongestORF(annot);
        }
    },

    setLongestORF: function (transcript) {
        var stopCodons = ['tga', 'tag', 'taa', 'TGA', 'TAG', 'TAA'];
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: transcript.get('seq_id'), start: transcript.get('start'), end: transcript.get('end')},
                    dojo.hitch(this, function (refSeqFeature) {
                        var seq = refSeqFeature.get('seq')
                            , offset = refSeqFeature.get('start');

                        var cdna   = [];
                        var island = []; // coordinate range on mRNA (spliced) mapped to offset from start of pre-mRNA (non-spliced)
                        var lastEnd, i = 0;
                        _.each(transcript.children(), function (f) {
                            if (f.get('type') === 'exon') {
                                var start = f.get('start') - offset
                                    , end = f.get('end') - offset;
                                cdna.push(seq.slice(start, end));

                                if (!lastEnd) { // first exon
                                    island.push([end - start, 0]);
                                }
                                else { // second exon onwards
                                    island.push([island[i - 1][0] + end - start, island[i - 1][1] + start - lastEnd])
                                }
                                lastEnd = end;
                                i++;
                            }
                        });
                        cdna = cdna.join('');

                        if (transcript.get('strand') == -1) {
                            cdna = Util.reverseComplement(cdna);
                        }

                        var orfStart, orfStop, longestORF = 0;
                        var startIndex = cdna.indexOf('ATG');
                        while (startIndex >= 0) {
                            var runningORF = 0;
                            var readingFrame = cdna.slice(startIndex);
                            _.each(readingFrame.match(/.{1,3}/g), function(codon) {
                                runningORF += 3;
                                if (stopCodons.indexOf(codon) !== -1) {
                                    return;
                                }
                            });
                            if (runningORF > longestORF) {
                                orfStart   = startIndex;
                                orfStop    = orfStart + runningORF;
                                longestORF = runningORF;
                            }
                            startIndex = cdna.indexOf('ATG', startIndex + 1);
                        }

                        //console.log(island);
                        //console.log(orfStart, orfStop);
                        orfStart = orfStart + offset + _.find(island, function (i) { if (i[0] >= orfStart) return i; })[1];
                        orfStop = orfStop + offset + _.find(island, function (i) { if (i[0] >= orfStop) return i; })[1];

                        if (transcript.get('strand') == -1) {
                            // simply swap start and stop
                            orfStart = orfStart + orfStop;
                            orfStop  = orfStart - orfStop;
                            orfStart = orfStart - orfStop;
                        }
                        //console.log(orfStart, orfStop);
                        //console.log(transcript.get('start'), transcript.get('end'), transcript.get('strand'));
                    }));
            }
        }));
    },

    showSequenceDialog: function () {
        if ($("#sequence pre").data('id') === this.selectionManager.getSelectedFeatures()[0].id()) {
            $("#sequence").modal();
        }
        else {
            this.getGenomicSequenceForSelectedFeature();
            $("#sequence .active").removeClass('active');
            $("#sequence .sequence-type-default").addClass('active');
        }
    },

    getGenomicSequenceForSelectedFeature: function () {
        var feature = this.selectionManager.getSelectedFeatures()[0];
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: feature.get('seq_id'), start: feature.get('start'), end: feature.get('end')},
                    dojo.hitch(this, function (refSeqFeature) {
                        var seq = refSeqFeature.get('seq');
                        var region = {
                            ref:   feature.get('seq_id'),
                            start: feature.get('start'),
                            end:   feature.get('end'),
                            strand: feature.get('strand'),
                            type: feature.get('type')
                        };

                        if (feature.get('strand') == -1) {
                            seq = Util.reverseComplement(seq)
                        }

                        var fasta = '>' //+ f.get('label')
                        + Util.assembleLocString(region)
                        + (region.type ? ' '+region.type : '')
                        + ' '+(region.end - region.start) + 'bp'
                        + "\n"
                        + seq;
                        $('#sequence pre').html(fasta).data('sequence_id', feature.id());
                        $('#sequence').modal();
                    }));
            }
        }));
    },

    getCDNASequenceForSelectedFeature: function () {
        var feature = this.selectionManager.getSelectedFeatures()[0];
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: feature.get('seq_id'), start: feature.get('start'), end: feature.get('end')},
                    dojo.hitch(this, function (refSeqFeature) {
                        var seq = refSeqFeature.get('seq')
                            , offset = refSeqFeature.get('start');

                        var cdna = [];
                        _.each(feature.children(), function (f) {
                            if (f.get('type') === 'exon') {
                                var start = f.get('start') - offset
                                    , end = f.get('end') - offset;
                                cdna.push(seq.slice(start, end));
                            }
                        });
                        cdna = cdna.join('');

                        var region = {
                            ref:   feature.get('ref'),
                            start: feature.get('start'),
                            end:   feature.get('end'),
                            strand: feature.get('strand'),
                            type: feature.get('type')
                        };

                        if (feature.get('strand') == -1) {
                            cdna = Util.reverseComplement(cdna);
                        }

                        var fasta = '>' //+ f.get('label')
                        + Util.assembleLocString(region)
                        + (region.type ? ' '+region.type : '')
                        + ' '+(region.end - region.start) + 'bp'
                        + "\n"
                        + cdna;
                        $('#sequence pre').html(fasta).data('id', feature.id());
                        $('#sequence').modal();
                    }));
            }
        }));
    },

    getCDSSequenceForSelectedFeature: function () {
        var feature = this.selectionManager.getSelectedFeatures()[0];
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: feature.get('seq_id'), start: feature.get('start'), end: feature.get('end')},
                    dojo.hitch(this, function (refSeqFeature) {
                        var seq = refSeqFeature.get('seq')
                            , offset = refSeqFeature.get('start');

                        var cds = [];
                        _.each(feature.children(), function (f) {
                            if (f.get('type') === 'CDS') {
                                var start = f.get('start') - offset
                                    , end = f.get('end') - offset;
                                cds.push(seq.slice(start, end));
                            }
                        });
                        cds = cds.join('');

                        var region = {
                            ref:   feature.get('ref'),
                            start: feature.get('start'),
                            end:   feature.get('end'),
                            strand: feature.get('strand'),
                            type: feature.get('type')
                        };

                        if (feature.get('strand') == -1) {
                            cds = Util.reverseComplement(cds);
                        }

                        var fasta = '>' //+ f.get('label')
                        + Util.assembleLocString(region)
                        + (region.type ? ' '+region.type : '')
                        + ' '+(region.end - region.start) + 'bp'
                        + "\n"
                        + cds;
                        $('#sequence pre').html(fasta).data('id', feature.id());
                        $('#sequence').modal();
                    }));
            }
        }));
    },

    getProteinSequenceForSelectedFeature: function () {
        var feature = this.selectionManager.getSelectedFeatures()[0];
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: feature.get('seq_id'), start: feature.get('start'), end: feature.get('end')},
                    dojo.hitch(this, function (refSeqFeature) {
                        var seq = refSeqFeature.get('seq')
                            , offset = refSeqFeature.get('start');

                        var cds = [];
                        _.each(feature.children(), function (f) {
                            if (f.get('type') === 'CDS') {
                                var start = f.get('start') - offset
                                    , end = f.get('end') - offset;
                                cds.push(seq.slice(start, end));
                            }
                        });
                        cds = cds.join('');

                        if (feature.get('strand') == -1) {
                            cds = Util.reverseComplement(cds)
                        }

                        var protein = cds.replace(/(...)/gi,  function(codon) {
                            var aa = CodonTable[codon];
                            if (!aa) {
                                aa = "?";
                            }
                            return aa;
                        });

                        var region = {
                            ref:   feature.get('ref'),
                            start: feature.get('start'),
                            end:   feature.get('end'),
                            strand: feature.get('strand'),
                            type: feature.get('type')
                        };

                        var fasta = '>' //+ f.get('label')
                        + Util.assembleLocString(region)
                        + (region.type ? ' '+region.type : '')
                        + ' '+(region.end - region.start) + 'bp'
                        + "\n"
                        + protein;
                        $('#sequence pre').html(fasta).data('id', feature.id());
                        $('#sequence').modal();
                    }));
            }
        }));
    },

    /* Create a new feature from another feature or array of features.
    *
    * NOTE: Doesn't copy children.
    */
    newFeature: function (from, data) {
        // if it's a jbrowse feature object
        if (from.hasOwnProperty('_uniqueID')) {
            var parent = data.parent;
            delete data.parent;
            return new SimpleFeature({
                data: $.extend({
                    type:   from.get('type'),
                    seq_id: from.get('seq_id'),
                    strand: from.get('strand'),
                    start:  from.get('start'),
                    end:    from.get('end')
                }, data),
                parent: parent ? parent : from.parent()
            });
        }
        // if it's a javascript array
        else if (from instanceof Array) {
            var track = this;
            var types = {
                'match_part': 'exon',
                'exon'      : 'exon',
                'CDS'       : 'CDS'
            }
            var feature = new SimpleFeature({
                data: {
                    type:   'transcript',
                    seq_id: from[0].get('seq_id'),
                    strand: from[0].get('strand')
                }
            });
            var subfeatures = _.map(from, function (f) {
                return track.newFeature(f, {parent: feature, type: types[f.get('type')]});
            });
            var hasCDS = _.find(subfeatures, function (f) {
                return f.get('type') === 'CDS';
            });
            if (!hasCDS) {
                _.each(subfeatures, function (f) {
                    if (f.get('type') === 'exon') {
                        subfeatures.push(track.newFeature(f, {type: 'CDS'}));
                    }
                });
            }
            subfeatures = this.sortAnnotationsByLocation(subfeatures);
            feature.set('start', subfeatures[0].get('start'));
            feature.set('end', subfeatures[subfeatures.length - 1].get('end'));
            feature.set('subfeatures', subfeatures);
            return feature;
        }
    },

    markNonCanonicalSites: function(transcript, callback) {
        this.browser.getStore('refseqs', dojo.hitch(this, function(refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: this.refSeq.name, start: transcript.get('start'), end: transcript.get('end')},
                    dojo.hitch(this, function (refSeqFeature) {
                        var sequence = refSeqFeature.get('seq');
                        transcript = this.markNonCanonicalSpliceSites(transcript, sequence);
                        transcript = this.markNonCanonicalTranslationStartSite(transcript, sequence);
                        transcript = this.markNonCanonicalTranslationStopSite(transcript, sequence);
                        callback.apply(this, transcript);
                    }));
            }
        }));
    },

    markNonCanonicalSpliceSites: function (transcript, sequence) {
        var offset = transcript.get('start')
        var cds_ranges  = [];

        // remove non-canonical splice sites from before
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return transcript.get('type') == 'non_canonical_splice_site';
        });

        for (var i = 0; i < subfeatures.length; i++) {
            var subfeature = subfeatures[i];
            if (subfeature.get('type') == 'exon') {
                cds_ranges.push([subfeature.get('start') - offset, subfeature.get('end') - offset]);
            }
        }
        var strand = transcript.get('strand');
        var nonCanonicalSpliceSites;
        if (strand === 1) {
            nonCanonicalSpliceSites = Bionode.findNonCanonicalSplices(sequence, cds_ranges);
        }
        else if (strand === -1) {
            nonCanonicalSpliceSites = Bionode.findNonCanonicalSplices(Util.reverseComplement(sequence), Bionode.reverseExons(cds_ranges, sequence.length));
            for (var i = 0; i < nonCanonicalSpliceSites.length; i++)
            nonCanonicalSpliceSites[i] = sequence.length - nonCanonicalSpliceSites[i];
        }
        for (var i = 0; i < nonCanonicalSpliceSites.length; i++) {
            var non_canonical_splice_site = nonCanonicalSpliceSites[i];
            subfeatures.push(new SimpleFeature({
                data: {
                    start: non_canonical_splice_site + offset,
                    end:   non_canonical_splice_site + offset + 1,
                    type:  'non_canonical_splice_site',
                    seq_id: transcript.get('seq_id'),
                    strand: transcript.get('strand')
                },
                parent: transcript
            }));
        }
        this.sortAnnotationsByLocation(subfeatures);
        transcript.set('subfeatures', subfeatures);
        return transcript;
    },

    markNonCanonicalTranslationStartSite: function (transcript, sequence) {
        // remove non-canonical translation start site from before
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.get('type') == 'non_canonical_translation_start_site';
        });

        var translationStart = this.getTranslationStart(transcript, sequence);
        if (translationStart[1].toLowerCase() !== 'atg') {
            subfeatures.push(new SimpleFeature({
                data: {
                    start: translationStart[0],
                    end:   translationStart[0] + 3,
                    type:  'non_canonical_translation_start_site',
                    seq_id: transcript.get('seq_id'),
                    strand: transcript.get('strand')
                },
                parent: transcript
            }));
        }
        this.sortAnnotationsByLocation(subfeatures);
        transcript.set('subfeatures', subfeatures);
        return transcript;
    },

    markNonCanonicalTranslationStopSite: function (transcript, sequence) {
        var stopCodons = ['tga', 'tag', 'taa'];
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.get('type') == 'non_canonical_translation_stop_site';
        });

        var translationStop = this.getTranslationStop(transcript, sequence);
        if (!_.contains(stopCodons, translationStop[1].toLowerCase())) {
            subfeatures.push(new SimpleFeature({
                data: {
                    start: translationStop[0],
                    end:   translationStop[0] + 3,
                    type:  'non_canonical_translation_stop_site',
                    seq_id: transcript.get('seq_id'),
                    strand: transcript.get('strand')
                },
                parent: transcript
            }));
        }
        this.sortAnnotationsByLocation(subfeatures);
        transcript.set('subfeatures', subfeatures);
        return transcript;
    },

    /* Takes a transcript (JB feature with exons and CDS) and returns a tuple of
     * 1. coordinate of translation start site
     * 2. translation start sequence
     */
    getTranslationStart: function (transcript, sequence) {
        var offset = transcript.get('start');
        var strand = transcript.get('strand');

        var firstCDS, translationStartSequence, translationStartCoordinate;
        if (strand === 1) {
            firstCDS = _.find(transcript.get('subfeatures'), function (f) {
                return f.get('type') == 'CDS';
            });
            translationStartCoordinate = firstCDS.get('start');
            translationStartSequence   = sequence.slice(translationStartCoordinate - offset, translationStartCoordinate - offset + 3);
        }
        else if (strand === -1) {
            firstCDS = _.find(transcript.get('subfeatures').slice().reverse(), function (f) {
                return f.get('type') == 'CDS';
            });
            translationStartCoordinate = firstCDS.get('end') - 3,
            translationStartSequence   = Util.complement(sequence).slice(translationStartCoordinate - offset, translationStartCoordinate - offset + 3).split('').reverse().join('');
        }
        return [translationStartCoordinate, translationStartSequence];
    },

    getTranslationStop: function (transcript, sequence) {
        var offset = transcript.get('start');
        var strand = transcript.get('strand');

        var lastCDS, translationStopSequence, translationStopCoordinate;
        if (strand === 1) {
            lastCDS = _.find(transcript.get('subfeatures').slice().reverse(), function (f) {
                return f.get('type') == 'CDS';
            });
            translationStopCoordinate = lastCDS.get('end') - 3;
            translationStopSequence   = sequence.slice(translationStopCoordinate - offset, translationStopCoordinate - offset + 3);
        }
        else if (strand === -1) {
            lastCDS = _.find(transcript.get('subfeatures'), function (f) {
                return f.get('type') == 'CDS';
            });
            translationStopCoordinate = lastCDS.get('start');
            translationStopSequence   = Util.complement(sequence).slice(translationStopCoordinate - offset, translationStopCoordinate - offset + 3);
            translationStopSequence   = Util.reverse(translationStopSequence);
        }
        return [translationStopCoordinate, translationStopSequence];
    },

    zoomToBaseLevel: function(event) {
        var coordinate = this.getGenomeCoord(event);
        this.gview.zoomToBaseLevel(event, coordinate);
    },

    zoomBackOut: function(event) {
        this.gview.zoomBackOut(event);
    },

    updateMenu: function() {
        //this.updateSetTranslationStartMenuItem();
        this.updateMergeMenuItem();
        this.updateSplitTranscriptMenuItem();
        this.updateMakeIntronMenuItem();
        //this.updateEditCommentsMenuItem();
        //this.updateEditDbxrefsMenuItem();
        //this.updateUndoMenuItem();
        //this.updateRedoMenuItem();
        //this.updateZoomToBaseLevelMenuItem();
        this.updateDuplicateMenuItem();
        this.updateFlipStrandMenuItem();
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

    updateSplitTranscriptMenuItem: function() {
        var menuItem = $('#contextmenu-split');
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.addClass('disabled')
            return;
        }
        var parent = selected[0].feature.parent();
        if (parent) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass('disabled');
    },

    updateMakeIntronMenuItem: function() {
        var menuItem = $("#contextmenu-make-intron");
        var selected = this.selectionManager.getSelection();
        if( selected.length > 1) {
            menuItem.addClass("disabled");
            return;
        }
        var parent = selected[0].feature.parent();
        if (!parent) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass("disabled");
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

    updateFlipStrandMenuItem: function () {
        var menuItem = $('#contextmenu-flipstrand');
        var selected = this.selectionManager.getSelection();
        var parent = selected[0].feature.parent();
        if (parent) {
            menuItem.addClass('disabled');
            return;
        }
        menuItem.removeClass('disabled');
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
            var charSize = this.browser.getSequenceTrack().getCharacterMeasurements();
            if (scale >= charSize.w && track.useResiduesOverlay)  {
                for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
                    var block = this.blocks[bindex];
                    this.browser.getSequenceTrack().store.getFeatures(
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
