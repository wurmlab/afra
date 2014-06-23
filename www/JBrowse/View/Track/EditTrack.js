define([
            'dojo/_base/declare',
            'jquery',
            'underscore',
            'jqueryui/droppable',
            'jqueryui/resizable',
            'contextmenu',
            'JBrowse/View/Track/DraggableHTMLFeatures',
            'JBrowse/FeatureSelectionManager',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/CodonTable',
            'bionode',
            'jquery.poll.js'
        ],
        function(declare,
                 $,
                 _,
                 droppable,
                 resizable,
                 contextmenu,
                 DraggableFeatureTrack,
                 FeatureSelectionManager,
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
        this.selectionClass = "selected-annotation";

        this.gview.browser.subscribe("/jbrowse/v1/n/navigate", dojo.hitch(this, function(currRegion) {
            if (currRegion.ref != this.refSeq.name) {
                if (this.listener && this.listener.fired == -1 ) {
                    this.listener.cancel();
                }
            }
        }));

        this.gview.browser.setGlobalKeyboardShortcut(8,  this, 'deleteSelectedFeatures', true);
        this.gview.browser.setGlobalKeyboardShortcut(46, this, 'deleteSelectedFeatures', true);

        $('#sequence input[type=number]')
        .poll()
        .change(dojo.hitch(this, function (e) {
            this.getGenomicSequenceForSelectedFeature();
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
        var featDiv = this.inherited(arguments);
        var track   = this;

        if (featDiv && featDiv != null)  {
            $(featDiv).contextmenu({
                target: '#contextmenu'
            })

            $(featDiv).droppable ({
                greedy:     true,
                accept:     ".selected-feature",
                tolerance:  "pointer",
                hoverClass: "annot-drop-hover",

                drop:       function (event, ui) {
                    var transcript = featDiv.feature;
                    var features = track.browser.featSelectionManager.getSelectedFeatures();
                    track.addToTranscript(transcript, features);
                    event.stopPropagation();
                }
            });
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

                    stop: function (event, ui)  {
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
                            var newTranscript = track.mergeExons(parent, leftExon, exon);
                            newTranscript.set('name', parent.get('name'));
                            track.replaceTranscripts([parent], [newTranscript]);
                        }
                        else if (rightExon && (exon.get('end') + rightDeltaBases) >= rightExon.get('start')) {
                            var newTranscript = track.mergeExons(parent, exon, rightExon);
                            newTranscript.set('name', parent.get('name'));
                            track.replaceTranscripts([parent], [newTranscript]);
                        }
                        else {
                            var newTranscript = track.resizeExon(parent, exon, leftDeltaBases, rightDeltaBases);
                            newTranscript.set('name', parent.get('name'));
                            track.replaceTranscripts([parent], [newTranscript]);
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
        $(this.div).droppable({
            accept: ".selected-feature",
            drop:   function (event, ui) {
                var features = track.browser.featSelectionManager.getSelectedFeatures();
                track.addDraggedFeatures(features);
            }
        });
    },

    /* Initializing view, including wiring it to the controller ends here. */

    /* CONTROLLERS - bridge between the view and model layer */
    processDraggedFeatures: function (features) {
        var transcripts = [];
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
                var newTranscript = this.createTranscript(feature.get('subfeatures'), this.generateName(feature))
                transcripts.push(newTranscript);
            }
        }

        if (subfeatures.length > 0) {
            var plusStranded = _.filter(subfeatures, function (f) {
                return f.get('strand') == 1;
            });
            var minusStranded = _.filter(subfeatures, function (f) {
                return f.get('strand') == -1;
            });

            if (plusStranded.length > 0) {
                var newTranscript = this.createTranscript(plusStranded, this.generateName(plusStranded[0].parent()));
                transcripts.push(newTranscript);
            }

            if (minusStranded.length > 0) {
                var newTranscript = this.createTranscript(minusStranded, this.generateName(minusStranded[0].parent()));
                transcripts.push(newTranscript);
            }
        }

        return transcripts;
    },

    addDraggedFeatures: function (features) {
        var transcripts = this.processDraggedFeatures(features);
        if (transcripts.length > 0) {
            this.insertTranscripts(transcripts);
        }
    },

    addToTranscript: function (transcript, features) {
        var transcripts = this.processDraggedFeatures(features);
        if (transcripts.length === 1) {
            var f = transcripts[0];
            if (!(f.get('start') > transcript.get('start') &&
                 f.get('start') < transcript.get('end'))   ||
                     !(f.get('end') > transcript.get('start')) &&
                         f.get('end') < transcript.get('end')) {

                if (f.get('strand') === transcript.get('strand')) {
                    var mergedTranscript = this.mergeTranscripts(transcript, f);
                    this.replaceTranscripts([transcript], [mergedTranscript]);
                }
            }
        }
        if (!mergedTranscript && transcripts.length > 0) {
            this.insertTranscripts(transcripts);
        }
    },

    duplicateSelectedFeatures: function () {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        this.duplicateFeatures(selected);
    },

    deleteSelectedFeatures: function () {
        var selected = this.selectionManager.getSelectedFeatures();

        _.each(selected, dojo.hitch(this, function (feature) {
            if (feature.parent()) {
                var newTranscript = this.deleteExon(feature.parent(), feature);
                if (newTranscript) {
                    this.replaceTranscripts([feature.parent()], [newTranscript]);
                }
                else {
                    this.deleteTranscripts([feature.parent()]);
                }
            }
            else {
                this.deleteTranscripts([feature]);
            }
        }));

        this.selectionManager.clearSelection();
    },

    mergeSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelectedFeatures();
        var sortedAnnots = this.sortAnnotationsByLocation(selected);
        var leftAnnot = sortedAnnots[0];
        var rightAnnot = sortedAnnots[sortedAnnots.length - 1];

        var newTranscript;
        if (leftAnnot.parent() && rightAnnot.parent() && leftAnnot.parent() == rightAnnot.parent()) {
            newTranscript = this.mergeExons(leftAnnot.parent(), leftAnnot, rightAnnot);
            this.markNonCanonicalSites(newTranscript, function () {
                this.replaceTranscripts([leftAnnot.parent()], [newTranscript]);
                // FIXME: the code below doesn't seem to have desired effect
                //var newMergedExon = _.find(newTranscript.get('subfeatures'), function (f) {
                    //return f.get('start') === mergedExon.get('start') &&
                        //f.get('end') === mergedExon.get('end');
                //});
                //var featdiv = this.getFeatDiv(newMergedExon);
                //$(featdiv).trigger('mousedown');
            });
        }
        else {
            newTranscript = this.mergeTranscripts(leftAnnot, rightAnnot);
            this.markNonCanonicalSites(newTranscript, function () {
                this.replaceTranscripts([leftAnnot, rightAnnot], [newTranscript]);
            });
        }

        this.selectionManager.clearSelection();
    },

    splitSelectedTranscript: function ()  {
        var transcript = this.selectionManager.getSelectedFeatures()[0];
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscripts = this.splitTranscript(transcript, coordinate);
        this.replaceTranscripts([transcript], newTranscripts);
        this.selectionManager.clearSelection();
    },

    makeIntronInSelectedExon: function () {
        var exon = this.selectionManager.getSelectedFeatures()[0];
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscript = this.makeIntron(exon.parent(), exon, coordinate);
        this.replaceTranscripts([exon.parent()], [newTranscript]);
        this.selectionManager.clearSelection();
    },

    setTranslationStartForSelectedTranscripts: function () {
        var selected = this.selectionManager.getSelectedFeatures()[0];
        var transcript = selected.parent() ? selected.parent() : selected;
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscript = this.setTranslationStart(transcript, coordinate);
        this.replaceTranscripts([transcript], [newTranscript]);
        this.selectionManager.clearSelection();
    },

    setTranslationStopForSelectedTranscripts: function () {
        var selected = this.selectionManager.getSelectedFeatures()[0];
        var transcript = selected.parent() ? selected.parent() : selected;
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscript = this.setTranslationStop(transcript, coordinate);
        this.replaceTranscripts([transcript], [newTranscript]);
        this.selectionManager.clearSelection();
    },

    setLongestORFForSelectedFeatures: function () {
        var selection = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        for (var i in selection)  {
            var annot = EditTrack.getTopLevelAnnotation(selection[i]);
            this.setLongestORF(annot);
        }
    },

    flipStrandForSelectedFeatures: function ()  {
        var selected = this.selectionManager.getSelectedFeatures();
        var modified = _.map(selected, dojo.hitch(this, function (transcript) {
            return this.flipStrand(transcript);
        }));

        this.replaceTranscripts(selected, modified);
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
        var coord = $('#sequence #bp input[type=number]').val();
        if (coord) {
            coord = parseInt(coord);
        }
        else {
            coord = 0;
        }

        var features = this.selectionManager.getSelectedFeatures();
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                var fasta = [];
                _.each(features, function (feature) {
                    refSeqStore.getFeatures(
                        {ref: feature.get('seq_id'), start: feature.get('start') - coord, end: feature.get('end') + coord},
                        dojo.hitch(this, function (refSeqFeature) {
                            var seq = refSeqFeature.get('seq');
                            var region = {
                                ref:    feature.get('seq_id'),
                                start:  feature.get('start') - coord,
                                end:    feature.get('end') + coord,
                                strand: feature.get('strand'),
                                type:   'genomic'
                            };

                            if (feature.get('strand') == -1) {
                                seq = Util.reverseComplement(seq)
                            }

                            var f_fasta = '>' + (feature.get('name') ? (feature.get('name') + ' ') : '')
                            + Util.assembleLocString(region)
                            + (region.type ? ' '+region.type : '')
                            + ' ' + seq.length + 'bp'
                            + "\n"
                            + seq;

                            fasta.push(f_fasta);
                        }));
                });
                fasta = fasta.join("\n");
                $('#sequence pre').html(fasta);//.data('sequence_id', feature.id());
                $('#sequence').modal();
                $('#bp').show();
            }
        }));
    },

    getCDNASequenceForSelectedFeature: function () {
        var features = this.selectionManager.getSelectedFeatures();

        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                var fasta = [];

                _.each(features, dojo.hitch(this, function (feature) {
                    var transcript = EditTrack.getTopLevelAnnotation(feature);
                    var fmin = feature.get('start')
                        , fmax = feature.get('end');

                    refSeqStore.getFeatures(
                        {ref: feature.get('seq_id'), start: feature.get('start'), end: feature.get('end')},
                        dojo.hitch(this, function (refSeqFeature) {
                            var seq = refSeqFeature.get('seq')
                                , offset = refSeqFeature.get('start');

                            var cdna = [];
                            _.each(transcript.children(), function (f) {
                                if (f.get('type') === 'exon' && f.get('start') >= fmin && f.get('end') <= fmax) {
                                    var start = f.get('start') - offset
                                        , end = f.get('end') - offset;
                                    cdna.push(seq.slice(start, end));
                                }
                            });
                            cdna = cdna.join('');

                            var region = {
                                ref:    feature.get('seq_id'),
                                start:  feature.get('start'),
                                end:    feature.get('end'),
                                strand: feature.get('strand'),
                                type:   'cDNA'
                            };

                            if (feature.get('strand') == -1) {
                                cdna = Util.reverseComplement(cdna);
                            }

                            var f_fasta = '>' + (feature.get('name') ? (feature.get('name') + ' ') : '')
                            + Util.assembleLocString(region)
                            + (region.type ? ' '+region.type : '')
                            + ' ' + cdna.length + 'bp'
                            + "\n"
                            + cdna;

                            fasta.push(f_fasta);
                        }));
                }));
                fasta = fasta.join("\n");
                $('#sequence pre').html(fasta);//.data('id', feature.id());
                $('#sequence').modal();
                $('#bp').hide();
            }
        }));
    },

    getCDSSequenceForSelectedFeature: function () {
        var features = this.selectionManager.getSelectedFeatures();
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                var fasta = [];

                _.each(features, dojo.hitch(this, function (feature) {
                    var transcript = EditTrack.getTopLevelAnnotation(feature);
                    var fmin = feature.get('start')
                        , fmax = feature.get('end');

                    refSeqStore.getFeatures(
                        {ref: feature.get('seq_id'), start: feature.get('start'), end: feature.get('end')},
                        dojo.hitch(this, function (refSeqFeature) {
                            var seq = refSeqFeature.get('seq')
                                , offset = refSeqFeature.get('start');

                            var cds = [];
                            _.each(transcript.children(), function (f) {
                                if (f.get('type') === 'CDS' && f.get('start') >= fmin && f.get('end') <= fmax) {
                                    var start = f.get('start') - offset
                                        , end = f.get('end') - offset;
                                    cds.push(seq.slice(start, end));
                                }
                            });
                            cds = cds.join('');

                            var region = {
                                ref:    feature.get('seq_id'),
                                start:  feature.get('start'),
                                end:    feature.get('end'),
                                strand: feature.get('strand'),
                                type:   'CDS'
                            };

                            if (feature.get('strand') == -1) {
                                cds = Util.reverseComplement(cds);
                            }

                            var f_fasta = '>' + (feature.get('name') ? (feature.get('name') + ' ') : '')
                            + Util.assembleLocString(region)
                            + (region.type ? ' '+region.type : '')
                            + ' ' + cds.length + 'bp'
                            + "\n"
                            + cds;

                            fasta.push(f_fasta);
                        }));
                }));
                fasta = fasta.join("\n");
                $('#sequence pre').html(fasta);//.data('id', feature.id());
                $('#sequence').modal();
                $('#bp').hide();
            }
        }));
    },

    getProteinSequenceForSelectedFeature: function () {
        var features = this.selectionManager.getSelectedFeatures();
        this.browser.getStore('refseqs', dojo.hitch(this, function (refSeqStore) {
            if (refSeqStore) {
                var fasta = [];

                _.each(features, dojo.hitch(this, function (feature) {
                    var transcript = EditTrack.getTopLevelAnnotation(feature);
                    var fmin = feature.get('start')
                        , fmax = feature.get('end');

                    refSeqStore.getFeatures(
                        {ref: feature.get('seq_id'), start: feature.get('start'), end: feature.get('end')},
                        dojo.hitch(this, function (refSeqFeature) {
                            var seq = refSeqFeature.get('seq')
                                , offset = refSeqFeature.get('start');

                            var cds = [];
                            _.each(transcript.children(), function (f) {
                                if (f.get('type') === 'CDS' && f.get('start') >= fmin && f.get('end') <= fmax) {
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
                                ref:    feature.get('seq_id'),
                                start:  feature.get('start'),
                                end:    feature.get('end'),
                                strand: feature.get('strand'),
                                type:   'protein'
                            };

                            var f_fasta = '>' + (feature.get('name') ? (feature.get('name') + ' ') : '')
                            + Util.assembleLocString(region)
                            + (region.type ? ' '+region.type : '')
                            + ' ' + protein.length + 'bp'
                            + "\n"
                            + protein;
                            fasta.push(f_fasta);
                        }));
                }));
                fasta = fasta.join("\n");
                $('#sequence pre').html(fasta);//.data('id', feature.id());
                $('#sequence').modal();
                $('#bp').hide();
            }
        }));
    },

    /* end CONTROLLERS - bridge between the view and model layer */

    /* Model layer */
    generateName: function (feature) {
        return 'afra-' + feature.get('seq_id') + '-mRNA-' + counter++;
    },

    resizeExon: function (transcript, exon, leftDelta, rightDelta) {
        var subfeatures = _.map(transcript.get('subfeatures'), dojo.hitch(this, function (f) {
            if (f.get('start') === exon.get('start') && f.get('end') === exon.get('end')) {
                return this.copyFeature(f, {
                    start: f.get('start') + leftDelta,
                    end:   f.get('end') + rightDelta
                });
            }
            else {
                return f;
            }
        }));

        var newTranscript = this.createTranscript(subfeatures, transcript.get('name'));
        return newTranscript;
    },

    mergeExons: function(transcript, leftExon, rightExon) {
        var subfeatures = _.reject(transcript.children(), function (f) {
            return f.id() == leftExon.id() || f.id() == rightExon.id();
        });
        var mergedExon = this.copyFeature(leftExon, {
                end: rightExon.get('end'),
            }
        );
        subfeatures.push(mergedExon);
        var newTranscript = this.createTranscript(subfeatures);
        newTranscript.set('name', transcript.get('name'));
        return newTranscript;
    },

    duplicateFeatures: function (feats)  {
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
                this.insertTranscripts([feats[i]]);
            }
        }
        if (subfeaturesToAdd.length > 0) {
            var newTranscript = this.createTranscript(subfeaturesToAdd);
            this.insertTranscripts([newTranscript]);
        }
    },

    deleteExon: function (transcript, exon)  {
        var subfeatures = transcript.get('subfeatures');
        var nExons = _.filter(subfeatures, function (f) {
            return f.get('type') === 'exon';
        });

        if (nExons.length < 2) {
            return;
        }
        else {
            // delete selected exon from transcript
            var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
                return f.get('start') === exon.get('start') && f.get('end') === exon.get('end');
            });
            var newTranscript = this.createTranscript(subfeatures, transcript.get('name'));
            return newTranscript;
        }
    },

    mergeTranscripts: function(leftTranscript, rightTranscript) {
        if (leftTranscript.parent())
            leftTranscript = leftTranscript.parent();

        if (rightTranscript.parent())
            rightTranscript = rightTranscript.parent();

        var subfeatures =
            leftTranscript.children().concat(rightTranscript.children());
        var newTranscript = this.createTranscript(subfeatures);
        newTranscript.set('name', 'afra-' + newTranscript.get('seq_id') + '-mRNA-' + counter++);
        return newTranscript;
    },

    makeIntron: function(transcript, exon, coordinate) {
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.id() === exon.id();
        });
        if (coordinate - 10 > exon.get('start')) {
            var leftExon  = this.copyFeature(exon, {
                end:    coordinate - 10
            });
            subfeatures.push(leftExon);
        }
        if (coordinate + 10 < exon.get('end')) {
            var rightExon = this.copyFeature(exon, {
                start:  coordinate + 10
            });
            subfeatures.push(rightExon);
        }
        var newTranscript = this.createTranscript(subfeatures, transcript.get('name'));
        return newTranscript;
    },

    splitTranscript: function (transcript, coordinate) {
        var children  = transcript.children();
        var featuresOnLeft = _.select(children, function (f) {
            return f.get('end') < coordinate;
        });
        var featuresOnRight = _.select(children, function (f) {
            return f.get('start') > coordinate;
        });

        var newTranscript1 = this.createTranscript(featuresOnLeft, this.generateName(featuresOnLeft[0].parent()));
        var newTranscript2 = this.createTranscript(featuresOnRight, this.generateName(featuresOnLeft[0].parent()));

        return [newTranscript1, newTranscript2];
    },

    setTranslationStart: function(transcript, coordinate) {
        var newTranscript = this.setCDS(transcript, {start: coordinate});
        return newTranscript;
    },

    setTranslationStop: function(transcript, coordinate) {
        var newTranscript = this.setCDS(transcript, {end: coordinate});
        return newTranscript;
    },

    setLongestORF: function (transcript) {
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

                        cdna = cdna.toLowerCase();

                        var orfStart, orfStop, longestORF = 0;
                        var startIndex = cdna.indexOf(CodonTable.START_CODON);
                        while (startIndex >= 0) {
                            var runningORF = 0;
                            var readingFrame = cdna.slice(startIndex);
                            _.each(readingFrame.match(/.{1,3}/g), function(codon) {
                                runningORF += 3;
                                if (CodonTable.STOP_CODONS.indexOf(codon) !== -1) {
                                    return;
                                }
                            });
                            if (runningORF > longestORF) {
                                orfStart   = startIndex;
                                orfStop    = orfStart + runningORF;
                                longestORF = runningORF;
                            }
                            startIndex = cdna.indexOf(CodonTable.START_CODON, startIndex + 1);
                        }

                        //console.log(island);
                        //console.log(orfStart, orfStop);
                        orfStart = orfStart + offset + _.find(island, function (i) { if (i[0] >= orfStart) return i; })[1];
                        orfStop = orfStop + offset + _.find(island, function (i) { if (i[0] >= orfStop) return i; })[1];

                        if (transcript.get('strand') == -1) {
                            // simply swap start and stop
                            var temp = orfStart;
                            orfStart = orfStop;
                            orfStop  = temp;
                        }
                        //console.log(orfStart, orfStop);
                        //console.log(transcript.get('start'), transcript.get('end'), transcript.get('strand'));

                        var newTranscript = this.setCDS(transcript, {start: orfStart, end: orfStop});
                        this.replaceTranscripts([transcript], [newTranscript]);
                    }));
            }
        }));
    },

    flipStrand: function (transcript) {
        if (transcript.parent()) {
            // can't flips strand for subfeatures
            return;
        }

        var subfeatures = _.map(transcript.children(), dojo.hitch(this, function (f) {
            return this.copyFeature(f, {
                strand: f.get('strand') * -1,
            });
        }));

        var newTranscript = this.createTranscript(subfeatures);
        newTranscript.set('name', transcript.get('name'));
        return newTranscript;
    },

    /* Return a copy of the given feature, with modifications applied.
     * NOTE: Doesn't copy children.
     */
    copyFeature: function (from, data) {
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
    },

    createTranscript: function(subfeatures, name) {
        var track = this;
        var types = {
            'match_part': 'exon',
            'exon'      : 'exon',
            'CDS'       : 'CDS'
        }
        var feature = new SimpleFeature({
            data: {
                type:   'transcript',
                name:   name,
                seq_id: subfeatures[0].get('seq_id'),
                strand: subfeatures[0].get('strand')
            }
        });
        var subfeatures = _.map(subfeatures, function (f) {
            return track.copyFeature(f, {parent: feature, type: types[f.get('type')]});
        });
        var hasCDS = _.find(subfeatures, function (f) {
            return f.get('type') === 'CDS';
        });
        if (!hasCDS) {
            _.each(subfeatures, function (f) {
                if (f.get('type') === 'exon') {
                    subfeatures.push(track.copyFeature(f, {type: 'CDS'}));
                }
            });
        }
        subfeatures = this.sortAnnotationsByLocation(subfeatures);
        feature.set('start', subfeatures[0].get('start'));
        feature.set('end', subfeatures[subfeatures.length - 1].get('end'));
        feature.set('subfeatures', subfeatures);
        return feature;
    },

    getCDSCoordinates: function (transcript) {
        var cdsStart, cdsEnd;
        var cdsFeatures = _.select(transcript.get('subfeatures'), function (f) {
            return f.get('type') === 'CDS';
        });

        // we know the subfeatures are sorted by their coordinates, so
        var cdsStart = cdsFeatures[0].get('start');
        var cdsEnd = cdsFeatures[cdsFeatures.length - 1].get('end')

        if (transcript.get('strand') == -1) {
            // simply swap start and stop
            var temp = cdsStart;
            cdsStart = cdsEnd;
            cdsEnd  = temp;
        }

        return [cdsStart, cdsEnd];
    },

    getCDS: function (transcript, sequence) {
        var cdsCoordinates = this.getCDSCoordinates(transcript);

        if (transcript.get('strand') === -1) {
            cdsCoordinates.reverse();
        }

        var offset = transcript.get('start');
        cdsCoordinates = _.map(cdsCoordinates, function (c) {
            return c - offset;
        })

        var cds = sequence.slice(cdsCoordinates[0], cdsCoordinates[1] + 1);
        if (transcript.get('strand') === -1) {
            cds = Util.reverseComplement(cds);
        }

        return cds;
    },

    getStartCodon: function (transcript, sequence) {
        var cds = this.getCDS(transcript, sequence);
        return cds.slice(0, 3);
    },

    getStopCodon: function (transcript, sequence) {
        var cds = this.getCDS(transcript, sequence);
        return cds.slice(-3);
    },

    getTranslationStart: function (transcript, sequence) {
        return this.getCDSCoordinates(transcript)[0];
    },

    getTranslationStop: function (transcript) {
        return this.getCDSCoordinates(transcript)[1] - 3;
    },

    // Insert CDS into a transcript replacing the old one if needed.
    setCDS: function (transcript, cdsCoordinates) {
        // filter out existing CDS, if any
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.get('type') === 'CDS';
        });

        var cdsStart = cdsCoordinates['start'] || this.getCDSCoordinates(transcript)[0];
        var cdsEnd = cdsCoordinates['end'] || this.getCDSCoordinates(transcript)[1];

        // insert new CDS
        if (transcript.get('strand') == -1) {
            // simply swap start and stop
            var temp = cdsStart;
            cdsStart = cdsEnd;
            cdsEnd  = temp;
        }
        _.each(subfeatures, dojo.hitch(this, function (f) {
            if (f.get('type') === 'exon') {
                if (f.get('start') >= cdsStart && f.get('end') <= cdsEnd) {
                    // exon containing CDS only
                    subfeatures.push(this.copyFeature(f, {type: 'CDS'}));
                }
                else if (f.get('start') < cdsStart && f.get('end') > cdsStart) {
                    // exon with a 5' UTR
                    subfeatures.push(this.copyFeature(f, {type: 'CDS', start: cdsStart}));
                }
                else if (f.get('start') < cdsEnd && f.get('end') > cdsEnd) {
                    // exon with a 3' UTR
                    subfeatures.push(this.copyFeature(f, {type: 'CDS', end: cdsEnd}));
                }
                else if (f.get('start') < cdsEnd && f.get('end') <= cdsEnd) {
                    // this exon contains the entire CDS - will never happen in practice
                    subfeatures.push(this.copyFeature(f, {type: 'CDS', start: cdsStart, end: cdsEnd}));
                }
                else {
                    // exon lies completely out of UTR
                    // do nothing
                }
            }
        }));

        // return a new transcript
        return this.createTranscript(subfeatures, transcript.get('name'));
    },

    /* MODEL VALIDATIONS */
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
            return f.get('type') === 'non_canonical_splice_site';
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
        if (!nonCanonicalSpliceSites) {
            nonCanonicalSpliceSites = [];
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
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.get('type') === 'non_canonical_translation_start_site';
        });

        var startCodon = this.getStartCodon(transcript, sequence);
        var translationStart = this.getTranslationStart(transcript);
        if (startCodon.toLowerCase() !== CodonTable.START_CODON) {
            subfeatures.push(new SimpleFeature({
                data: {
                    start: translationStart,
                    end:   translationStart + 3,
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
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.get('type') == 'non_canonical_translation_stop_site';
        });

        var stopCodon = this.getStopCodon(transcript, sequence);
        var translationStop = this.getTranslationStop(transcript);
        if (!_.contains(CodonTable.STOP_CODONS, stopCodon.toLowerCase())) {
            subfeatures.push(new SimpleFeature({
                data: {
                    start: translationStop,
                    end:   translationStop + 3,
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

    /* end MODEL VALIDATIONS */
    /* end MODEL */

    /* VIEW HELPERS - update the view based on controller events */

    insertTranscripts: function (transcripts) {
        if (transcripts.length < 1) return;

        this.backupStore();
        _.each(transcripts, dojo.hitch(this, function (t) {
            this.markNonCanonicalSites(t, function () {
                this.store.insert(t);
                this.changed();
            });
        }));
    },

    deleteTranscripts: function (transcripts) {
        if (transcripts.length < 1) return;

        this.backupStore();
        _.each(transcripts, dojo.hitch(this, function (t) {
            this.store.deleteFeatureById(t.id());
            this.changed();
        }));
    },

    replaceTranscripts: function(transcriptsToReplace, transcriptsToInsert) {
        if (transcriptsToReplace.length < 1) return;
        if (transcriptsToInsert.length < 1) return;

        this.backupStore();
        _.each(transcriptsToReplace, dojo.hitch(this, function (t) {
            this.store.deleteFeatureById(t.id());
        }));
        _.each(transcriptsToInsert, dojo.hitch(this, function (t) {
            this.markNonCanonicalSites(t, function () {
                this.store.insert(t);
            });
        }));
        this.changed();
    },

    undo: function () {
        this.redoState = $.extend({}, this.store.features);
        this.store.features = this.undoState;
        this.undoState = null;
        this.changed();
    },

    redo: function () {
        this.backupStore();
        this.store.features = this.redoState;
        this.redoState = null;
        this.changed();
    },

    backupStore: function () {
        this.undoState = $.extend({}, this.store.features);
    },

    updateMenu: function() {
        this.updateMergeMenuItem();
        this.updateSplitTranscriptMenuItem();
        this.updateMakeIntronMenuItem();
        this.updateDuplicateMenuItem();
        this.updateFlipStrandMenuItem();
        this.updateSetTranslationStartMenuItem();
        this.updateSetTranslationStopMenuItem();
        this.updateSetLongestORFMenuItem();
        this.updateUndoMenuItem();
        this.updateRedoMenuItem();
    },

    updateSetTranslationStartMenuItem: function () {
        var menuItem = $('#contextmenu-set-translation-start');
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass('disabled');
    },

    updateSetTranslationStopMenuItem: function () {
        var menuItem = $('#contextmenu-set-translation-stop');
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass('disabled');
    },

    updateSetLongestORFMenuItem: function () {
        var menuItem = $('#contextmenu-set-longest-orf');
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass('disabled');
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

    updateUndoMenuItem: function() {
        var menuItem = $("#contextmenu-undo");
        if (this.undoState) {
            menuItem.removeClass("disabled");
            return;
        }
        menuItem.addClass("disabled");
    },

    updateRedoMenuItem: function() {
        var menuItem = $("#contextmenu-redo");
        if (this.redoState) {
            menuItem.removeClass("disabled");
            return;
        }
        menuItem.addClass("disabled");
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
