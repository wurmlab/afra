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
            'FileSaver/FileSaver',
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
                 saveAs,
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
                    var selection = track.browser.featSelectionManager.getSelection();
                    track.addToTranscript(transcript, selection);
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
                            track.replaceTranscript(parent, newTranscript);
                        }
                        else if (rightExon && (exon.get('end') + rightDeltaBases) >= rightExon.get('start')) {
                            var newTranscript = track.mergeExons(parent, exon, rightExon);
                            newTranscript.set('name', parent.get('name'));
                            track.replaceTranscript(parent, newTranscript);
                        }
                        else {
                            var newTranscript = track.resizeExon(parent, exon, leftDeltaBases, rightDeltaBases);
                            newTranscript.set('name', parent.get('name'));
                            track.replaceTranscript(parent, newTranscript, function (t) {
                                var newExon = _.find(t.get('subfeatures'), _.bind(function (f) {
                                    if (this.areFeaturesOverlapping(exon, f)) {
                                        return true;
                                    }
                                }, this));
                                this.highlightFeature(newExon);
                            });
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
                var selection = track.browser.featSelectionManager.getSelection();
                track.addDraggedFeatures(selection);
            }
        });
    },

    /* Initializing view, including wiring it to the controller ends here. */

    /* CONTROLLERS - bridge between the view and model layer */
    processDraggedFeatures: function (selection) {
        var transcripts = [];
        var subfeatures = [];
        for (var i in selection)  {
            var hadParent  = !!selection[i].feature.parent();
            var transcript = this.normalizeFeature(selection[i].feature, selection[i].track);
            if (hadParent) {
                subfeatures = subfeatures.concat(transcript.get('subfeatures'));
            }
            else {
                transcript.set('name', this.generateName(transcript));
                transcripts.push(transcript);
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

    addDraggedFeatures: function (selection) {
        var transcripts = this.processDraggedFeatures(selection);
        if (transcripts.length > 0) {
            this.insertTranscripts(transcripts);
        }
    },

    addToTranscript: function (transcript, selection) {
        var transcripts = this.processDraggedFeatures(selection);
        if (transcripts.length === 1) {
            var f = transcripts[0];
            if (!(f.get('start') > transcript.get('start') &&
                 f.get('start') < transcript.get('end'))   ||
                     !(f.get('end') > transcript.get('start')) &&
                         f.get('end') < transcript.get('end')) {

                if (f.get('strand') === transcript.get('strand')) {
                    var mergedTranscript = this.mergeTranscripts(transcript, f);
                    this.replaceTranscript(transcript, mergedTranscript);
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
                    this.replaceTranscript(feature.parent(), newTranscript);
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
            this.replaceTranscript(leftAnnot.parent(), newTranscript);
        }
        else {
            newTranscript = this.mergeTranscripts(leftAnnot, rightAnnot);
            this.replaceMergedTranscripts([leftAnnot, rightAnnot], newTranscript);
        }

        this.selectionManager.clearSelection();
    },

    splitSelectedTranscript: function ()  {
        var transcript = this.selectionManager.getSelectedFeatures()[0];
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscripts = this.splitTranscript(transcript, coordinate);
        this.replaceSplitTranscript(transcript, newTranscripts);
        this.selectionManager.clearSelection();
    },

    makeIntronInSelectedExon: function () {
        var exon = this.selectionManager.getSelectedFeatures()[0];
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscript = this.makeIntron(exon.parent(), exon, coordinate);
        this.replaceTranscript(exon.parent(), newTranscript);
        this.selectionManager.clearSelection();
    },

    setTranslationStartForSelectedTranscript: function () {
        var selected = this.selectionManager.getSelectedFeatures()[0];
        var transcript = selected.parent() ? selected.parent() : selected;
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscript = this.setTranslationStart(transcript, coordinate);
        this.replaceTranscript(transcript, newTranscript);
        this.selectionManager.clearSelection();
    },

    setTranslationStopForSelectedTranscript: function () {
        var selected = this.selectionManager.getSelectedFeatures()[0];
        var transcript = selected.parent() ? selected.parent() : selected;
        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscript = this.setTranslationStop(transcript, coordinate);
        this.replaceTranscript(transcript, newTranscript);
        this.selectionManager.clearSelection();
    },

    setLongestORFForSelectedTranscript: function () {
        var transcript = this.selectionManager.getSelectedFeatures()[0];
        this.selectionManager.clearSelection();
        this.setLongestORF(transcript);
    },

    flipStrandForSelectedFeatures: function ()  {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        var modified = _.map(selected, dojo.hitch(this, function (transcript) {
            return this.flipStrand(transcript);
        }));

        this.replaceTranscripts(selected, modified, this.highlightFeatures);
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

    downloadSequence: function () {
        var data = $('#sequence pre').text();
        var meta = data.split("\n")[0].split(' ');
        var file = 'afra-' + meta[1].replace(/\:|(\.\.)/g, '_').slice(0, -3) + '-' + meta[2] + '.fa';
        saveAs(new Blob([data], {type: 'text/plain'}), file);
    },

    /* end CONTROLLERS - bridge between the view and model layer */

    /* Model layer */
    generateName: function (feature) {
        return 'afra-' + feature.get('seq_id') + '-mRNA-' + counter++;
    },

    areFeaturesOverlapping: function (feature1, feature2) {
        var features = this.sortAnnotationsByLocation([feature1, feature2]);
        var f1 = features[0];
        var f2 = features[1];
        if (f2.get('start') - f1.get('end') < 1) {
            return true;
        }
        return false;
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
                            _.every(readingFrame.match(/.{1,3}/g), function (codon) {
                                runningORF += 3;
                                if (CodonTable.STOP_CODONS.indexOf(codon) !== -1) {
                                    return false;
                                }
                                return true;
                            });
                            if (runningORF > longestORF) {
                                orfStart   = startIndex;
                                orfStop    = orfStart + runningORF;
                                longestORF = runningORF;
                            }
                            startIndex = cdna.indexOf(CodonTable.START_CODON, startIndex + 1);
                        }

                        if (transcript.get('strand') == -1) {
                            orfStart = cdna.length - orfStart;
                            orfStop  = cdna.length - orfStop;
                        }
                        orfStart = orfStart + offset + _.find(island, function (i) { if (i[0] >= orfStart) return i; })[1];
                        orfStop = orfStop + offset + _.find(island, function (i) { if (i[0] >= orfStop) return i; })[1];

                        var newTranscript = this.setCDS(transcript, {start: orfStart, end: orfStop});
                        this.replaceTranscript(transcript, newTranscript);
                    }));
            }
        }));
    },

    setORF: function (transcript, refSeq) {
        if (!this.hasCDS(transcript)) {
            return transcript;
        }

        var offset = transcript.get('start');

        var cdna   = [];
        var island = []; // coordinate range on mRNA (spliced) mapped to offset from start of pre-mRNA (non-spliced)
        var lastEnd, i = 0;
        _.each(transcript.children(), function (f) {
            if (f.get('type') === 'exon') {
                var start = f.get('start') - offset
                    , end = f.get('end') - offset;
                cdna.push(refSeq.slice(start, end));

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
        cdna = cdna.join('').toLowerCase();
        if (transcript.get('strand') == -1) {
            cdna = Util.reverseComplement(cdna);
        }

        var orfStart, orfStop, readingFrame;
        orfStart = this.getTranslationStart(transcript);
        orfStart = orfStart - offset;
        orfStart = orfStart - _.find(island, function (i) { if ((orfStart - i[1]) <= i[0]) return i; })[1];
        if (transcript.get('strand') == -1) {
            orfStart = cdna.length - orfStart;
        }
        orfStop      = orfStart;
        readingFrame = cdna.slice(orfStart);
        _.every(readingFrame.match(/.{1,3}/g), function (codon) {
            orfStop += 3;
            if (CodonTable.STOP_CODONS.indexOf(codon) !== -1) {
                return false;
            }
            return true;
        });

        if (transcript.get('strand') === -1) {
            orfStart = cdna.length - orfStart;
            orfStop  = cdna.length - orfStop;
        }
        orfStart = orfStart + offset + _.find(island, function (i) { if (i[0] >= orfStart) return i; })[1];
        orfStop = orfStop + offset + _.find(island, function (i) { if (i[0] >= orfStop) return i; })[1];

        var newTranscript = this.setCDS(transcript, {start: orfStart, end: orfStop});
        return newTranscript;
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

    /* Returns a transcript that lends itself to easy editing.
     *
     * Transcript returned by this method will always have exons, but may not
     * have CDS. If the track the feature is from was configured to use
     * 'transcript' style for parent element (true for MAKER, AUGUSTUS, SNAP,
     * etc.) the resulting transcript will contain CDS.
     *
     * Subfeatures are converted into transcript. So an exon will be returned
     * as a transcript with one exon, and optionally a CDS depending on which
     * track the subfeature comes from.
     *
     * Transcripts can only contain exons and CDS. UTRs are implied. Non-CDS
     * exonic regions are UTR.
     */
    normalizeFeature: function (feature, track) {
        if (feature.parent()) {
            var subfeatures = _.select(feature.parent().children(), function (f) {
                if (f.get('start') >= feature.get('start') &&
                    f.get('end') <= feature.get('end')) {
                    return f;
                }
            });
            return this.normalizeFeature(this.createTranscript(subfeatures), track);
        }

        var subfeatures = this.sortAnnotationsByLocation(feature.get('subfeatures'))
            , data      = [];

        _.each(subfeatures, function (f) {
            var l = data[data.length - 1];
            if (l && (f.get('start') - l['end'] <= 1)) { // we are looking for introns
                l['end'] = Math.max(l['end'], f.get('end'));
            }
            else {
                data.push({
                    type:   'exon',
                    name:   f.get('name'),
                    seq_id: f.get('seq_id'),
                    strand: f.get('strand'),
                    start:  f.get('start'),
                    end:    f.get('end'),
                });
            }
        });

        if (track.config.style.className === 'transcript') {
            var subfeatureClasses = track.config.style.subfeatureClasses;
            var cdsTerm = _.find(_.keys(subfeatureClasses), function (k) {
                if (subfeatureClasses[k] === 'CDS') {
                    return true;
                }
            });
            if (cdsTerm) {
                _.each(subfeatures, function (f) {
                    if (f.get('type') === cdsTerm) {
                        data.push({
                            type:   'CDS',
                            name:   f.get('name'),
                            seq_id: f.get('seq_id'),
                            strand: f.get('strand'),
                            start:  f.get('start'),
                            end:    f.get('end'),
                        });
                    }
                });
            }
        }

        var transcript = new SimpleFeature({
            data: {
                type:   'transcript',
                name:   feature.get('name'),
                seq_id: feature.get('seq_id'),
                strand: feature.get('strand'),
                start:  feature.get('start'),
                end:    feature.get('end'),
                subfeatures: data
            }
        });
        return transcript;
    },

    createTranscript: function (subfeatures, name) {
        var transcript = new SimpleFeature({
            data: {
                type:   'transcript',
                name:   name,
                seq_id: subfeatures[0].get('seq_id'),
                strand: subfeatures[0].get('strand'),
                subfeatures: _.map(subfeatures, function (f) {
                    return {
                        type:   f.get('type'),
                        name:   f.get('name'),
                        seq_id: f.get('seq_id'),
                        strand: f.get('strand'),
                        start:  f.get('start'),
                        end:    f.get('end'),
                    };
                })
            }
        });

        subfeatures = transcript.get('subfeatures');
        var fmin = _.min(_.map(subfeatures, function (f) { return f.get('start'); }));
        var fmax = _.max(_.map(subfeatures, function (f) { return f.get('end');   }));
        transcript.set('start', fmin);
        transcript.set('end',   fmax);
        return transcript;
    },

    hasCDS: function (transcript) {
        return !!_.find(transcript.get('subfeatures'), function (f) {
            return f.get('type') === 'CDS';
        });
    },

    getCDSCoordinates: function (transcript) {
        var cdsFeatures = _.select(transcript.get('subfeatures'), function (f) {
            return f.get('type') === 'CDS';
        });

        if (cdsFeatures.length === 0) {
            return [undefined, undefined];
        }

        var cdsMin = _.min(_.map(cdsFeatures, function (f) { return f.get('start'); }));
        var cdsMax = _.max(_.map(cdsFeatures, function (f) { return f.get('end');   }));

        if (transcript.get('strand') == -1) {
            // simply swap start and stop
            var temp = cdsMin;
            cdsMin = cdsMax;
            cdsMax = temp;
        }

        return [cdsMin, cdsMax];
    },

    getCDS: function (transcript, refSeq) {
        var offset = transcript.get('start');

        var cds = [];
        _.each(transcript.get('subfeatures'), function (f) {
            if (f.get('type') === 'CDS') {
                var start = f.get('start');
                var end   = f.get('end');
                cds.push(refSeq.slice(start, end));
            }
        });
        cds = cds.join('');

        if (transcript.get('strand') === -1) {
            cds = Util.reverseComplement(cds);
        }

        return cds;
    },

    getStartCodon: function (transcript, refSeq) {
        var cds = this.getCDS(transcript, refSeq);
        return cds.slice(0, 3);
    },

    getStopCodon: function (transcript, refSeq) {
        var cds = this.getCDS(transcript, refSeq);
        return cds.slice(-3);
    },

    getTranslationStart: function (transcript) {
        return this.getCDSCoordinates(transcript)[0];
    },

    getTranslationStop: function (transcript) {
        return this.getCDSCoordinates(transcript)[1];
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

    getRefSeq: function (callback) {
        this.browser.getStore('refseqs', _.bind(function(refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getFeatures(
                    {ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end},
                    _.bind(function (refSeqFeature) {
                        callback.apply(this, [refSeqFeature.get('seq')]);
                    }, this));
            }
        }, this));
    },

    /* MODEL VALIDATIONS */
    markNonCanonicalSites: function (transcript, refSeq) {
        transcript = this.markNonCanonicalSpliceSites(transcript, refSeq);
        transcript = this.markNonCanonicalTranslationStartSite(transcript, refSeq);
        transcript = this.markNonCanonicalTranslationStopSite(transcript, refSeq);
        return transcript;
    },

    markNonCanonicalSpliceSites: function (transcript, refSeq) {
        var seq    = refSeq.slice(transcript.get('start'), transcript.get('end'));
        var offset = transcript.get('start');
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
            nonCanonicalSpliceSites = Bionode.findNonCanonicalSplices(seq, cds_ranges);
        }
        else if (strand === -1) {
            nonCanonicalSpliceSites = Bionode.findNonCanonicalSplices(Util.reverseComplement(seq), Bionode.reverseExons(cds_ranges, seq.length));
            for (var i = 0; i < nonCanonicalSpliceSites.length; i++)
            nonCanonicalSpliceSites[i] = seq.length - nonCanonicalSpliceSites[i];
        }
        if (!nonCanonicalSpliceSites) {
            nonCanonicalSpliceSites = [];
        }
        for (var i = 0; i < nonCanonicalSpliceSites.length; i++) {
            var non_canonical_splice_site = nonCanonicalSpliceSites[i];
            subfeatures.push(new SimpleFeature({
                data: {
                    start: non_canonical_splice_site + offset,
                    end:   non_canonical_splice_site + offset,
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

    markNonCanonicalTranslationStartSite: function (transcript, refSeq) {
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.get('type') === 'non_canonical_translation_start_site';
        });

        var startCodon = this.getStartCodon(transcript, refSeq);
        var translationStart = this.getTranslationStart(transcript);
        if (startCodon && translationStart && (startCodon.toLowerCase() !== CodonTable.START_CODON)) {
            subfeatures.push(new SimpleFeature({
                data: {
                    start: translationStart,
                    end:   translationStart,
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

    markNonCanonicalTranslationStopSite: function (transcript, refSeq) {
        var subfeatures = _.reject(transcript.get('subfeatures'), function (f) {
            return f.get('type') == 'non_canonical_translation_stop_site';
        });

        var stopCodon = this.getStopCodon(transcript, refSeq);
        var translationStop = this.getTranslationStop(transcript);
        if (stopCodon && translationStop && !_.contains(CodonTable.STOP_CODONS, stopCodon.toLowerCase())) {
            subfeatures.push(new SimpleFeature({
                data: {
                    start: translationStop,
                    end:   translationStop,
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

    highlightFeature: function (feature) {
        var div = this.getFeatDiv(feature);
        $(div).trigger('mousedown');
    },

    highlightFeatures: function () {
        var features = Array.prototype.slice.call(arguments);
        _.each(features, _.bind(function (feature) {
            this.highlightFeature(feature);
        }, this));
    },

    insertTranscript: function (transcript, callback) {
        this.insertTranscripts([transcript], callback);
    },

    insertTranscripts: function (transcripts, callback) {
        if (transcripts.length < 1) return;

        this.backupStore();
        try {
            this.getRefSeq(function (refSeq) {
                var inserted = [];
                _.each(transcripts, _.bind(function (toInsert) {
                    toInsert = this.markNonCanonicalSites(toInsert, refSeq);
                    this.store.insert(toInsert);
                    inserted.push(toInsert);
                }, this));
                this.changed();
                if (callback) {
                    callback.apply(this, inserted);
                }
            });
        }
        catch (e) {
            console.error(e, e.stack);
            this.undo();
        }
    },

    deleteTranscript: function (transcript, callback) {
        this.deleteTranscripts([transcript], callback);
    },

    deleteTranscripts: function (transcripts, callback) {
        if (transcripts.length < 1) return;

        this.backupStore();
        try {
            var removed = [];
            _.each(transcripts, _.bind(function (t) {
                this.store.remove(t);
                removed.push(t);
            }, this));
            this.changed();
            if (callback) {
                callback.apply(this, removed);
            }
        }
        catch (e) {
            console.error(e, e.stack);
            this.undo();
        }
    },

    replaceTranscript: function (transcriptToRemove, transcriptToInsert, callback) {
        this.replaceTranscripts([transcriptToRemove], [transcriptToInsert], callback);
    },

    replaceTranscripts: function (transcriptsToRemove, transcriptsToInsert, callback) {
        if (transcriptsToRemove.length !== transcriptsToInsert.length) {
            throw "Number of old and new transcripts should be the same.";
        }
        if (transcriptsToRemove.length < 1) return;

        this.backupStore();
        try {
            this.getRefSeq(function (refSeq) {
                var inserted = [];
                _.each(_.zip(transcriptsToRemove, transcriptsToInsert), _.bind(function (pair) {
                    var toRemove = pair[0];
                    var toInsert = pair[1];
                    toInsert = this.setORF(toInsert, refSeq);
                    toInsert = this.markNonCanonicalSites(toInsert, refSeq);
                    toInsert.id(toRemove.id());
                    this.store.replace(toInsert);
                    inserted.push(toInsert);
                }, this));
                this.changed();
                if (callback) {
                    callback.apply(this, inserted);
                }
            });
        }
        catch (e) {
            console.error(e, e.stack);
            this.undo();
        }
    },

    replaceSplitTranscript: function (transcriptToRemove, transcriptsToInsert, callback) {
        if (!transcriptToRemove || transcriptsToInsert.length < 1) return;
        this.backupStore();
        try {
            this.store.remove(transcriptToRemove);
            this.getRefSeq(function (refSeq) {
                var inserted = [];
                _.each(transcriptsToInsert, _.bind(function (toInsert) {
                    toInsert = this.setORF(toInsert, refSeq);
                    toInsert = this.markNonCanonicalSites(toInsert, refSeq);
                    this.store.insert(toInsert);
                    inserted.push(toInsert);
                }, this));
                this.changed();
                if (callback) {
                    callback.apply(this, inserted);
                }
            });
        }
        catch (e) {
            console.error(e, e.stack);
            this.undo();
        }
    },

    replaceMergedTranscripts: function (transcriptsToRemove, transcriptToInsert, callback) {
        if (transcriptsToRemove.length < 1 || !transcriptToInsert) return;
        this.backupStore();
        try {
            _.each(transcriptsToRemove, _.bind(function (t) {
                this.store.remove(t);
            }, this));
            this.getRefSeq(function (refSeq) {
                transcriptToInsert = this.markNonCanonicalSites(transcriptToInsert, refSeq);
                transcriptToInsert.id(transcriptsToRemove[0].id());
                this.store.insert(transcriptToInsert);
                this.changed();
                if (callback) {
                    callback.apply(this, [transcriptToInsert]);
                }
            });
        }
        catch (e) {
            console.error(e, e.stack);
            this.undo();
        }
    },

    undo: function () {
        this.redoState = this.store.features.slice();
        this.store.features = this.undoState;
        this.undoState = null;
        this.changed();
    },

    redo: function () {
        this.undoState = this.store.features.slice();
        this.store.features = this.redoState;
        this.redoState = null;
        this.changed();
    },

    backupStore: function () {
        this.undoState = this.store.features.slice();
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
        var selected = this.selectionManager.getSelectedFeatures();
        if (selected.length > 1 || selected[0].parent()) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass('disabled');
    },

    updateSetTranslationStopMenuItem: function () {
        var menuItem = $('#contextmenu-set-translation-stop');
        var selected = this.selectionManager.getSelectedFeatures();
        if (selected.length > 1 || selected[0].parent()) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass('disabled');
    },

    updateSetLongestORFMenuItem: function () {
        var menuItem = $('#contextmenu-set-longest-orf');
        var selected = this.selectionManager.getSelectedFeatures();
        if (selected.length > 1 || selected[0].parent()) {
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

    selectionAdded: function (selection) {
        this.inherited(arguments);

        var feature = EditTrack.getTopLevelAnnotation(selection.feature);
        var featureDiv = this.getFeatDiv(feature);
        var seqTrack = this.browser.getSequenceTrack();
        if (featureDiv)  {
            var strand = feature.get('strand');
            var featureTop = $(featureDiv).position().top;
            var scale = this.gview.bpToPx(1);
            var charSize = seqTrack.getCharacterMeasurements();
            if (scale >= charSize.w && this.useResiduesOverlay)  {
                for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
                    var block = this.blocks[bindex];
                    this.browser.getSequenceTrack().store.getFeatures(
                        {ref: this.refSeq.name, start: block.startBase, end: block.endBase},
                        function (refSeqFeature) {
                            var seq = refSeqFeature.get('seq');
                            var top = featureTop - 2; // -2 hardwired adjustment to center
                            var addBP = true;
                            $('div.sequence', block.domNode).each(function () {
                                if ($(this).position().top === top) {
                                    return (addBP = false);
                                }
                            });

                            if (addBP) {
                                // make a div to contain the sequences
                                var seqNode = document.createElement("div");
                                seqNode.className = "sequence";
                                seqNode.style.width = "100%";
                                seqNode.style.top = top + "px";

                                if (strand == '-' || strand == -1)  {
                                    seq = Util.complement(seq);
                                }

                                seqNode.appendChild(seqTrack._ntDiv(seq));
                                block.domNode.appendChild(seqNode);
                            }
                        });
                }
            }
        }

        this.updateMenu();
    },

    selectionRemoved: function (selection)  {
        this.inherited(arguments);

        if (selection.track === this)  {
            $("div.sequence", this.div).remove();
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
