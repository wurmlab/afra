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
            'JBrowse/Store/Stack',
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
                 SimpleFeature,
                 Util,
                 Layout,
                 CodonTable,
                 saveAs,
                 Stack,
                 Bionode) {

var counter = 1;

var EditTrack = declare(DraggableFeatureTrack,
{
    constructor: function( args ) {
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

        $(window).on('storage', _.bind(function (evt) {
            this.store.features = this.store._parseLocalStorage();
            this.changed();
            this.updateDoneButton();
        }, this));

        this.updateDoneButton();
    },

    _defaultConfig: function () {
        var thisConfig = this.inherited(arguments);
        thisConfig.noExport = true;  // turn off default "Save track data" "
        thisConfig.style.centerChildrenVertically = false;
        return thisConfig;
    },

    /**
     * Extend superclass method to make this track droppable.
     */
    setViewInfo: function (genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale) {
        this.inherited(arguments);
        this.makeTrackDroppable();
        this.hide();
        this.show();
    },

    /**
     * Make the track droppable.
     */
    makeTrackDroppable: function() {
        $(this.div).droppable({
            accept: ".selected-feature",
            drop:   _.bind(function (event, ui) {
                var selection = this.browser.featSelectionManager.getSelection();
                this.addDraggedFeatures(selection);
            }, this)
        });
    },

    /**
     *  Extend superclass method to add event handling right-click context menu
     *  and make annotation in this track droppable.
     */
    renderFeature: function (feature, uniqueId, block, scale, labelScale, descriptionScale, containerStart, containerEnd) {
        var featDiv  = this.inherited(arguments);
        var $featDiv = $(featDiv);

        $featDiv
        .attr('data-toggle', 'context')
        .attr('data-target', '#contextmenu');

        $featDiv.droppable({
            greedy:     true,
            accept:     ".selected-feature",
            tolerance:  "pointer",
            hoverClass: "annot-drop-hover",

            drop: _.bind(function (event, ui) {
                var transcript = featDiv.feature;
                var selection = this.browser.featSelectionManager.getSelection();
                this.addDraggedFeatures(selection, transcript);
                event.stopPropagation();
            }, this)
        });

        return featDiv;
    },

    /**
     *  Extend superclass method to make exons resizable.
     */
    renderSubfeature: function (feature, featDiv, subfeature,
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
    onAnnotMouseDown: function (event)  {
        event = event || window.event;
        var featureDiv = this.getLowestFeatureDiv(event.currentTarget ||
                                                   event.srcElement);

        // Are we zoomed to base pair level? If yes, we will activate snapping
        // to the next base pair, when resizing, via resizable's grid option.
        var scale  = parseInt(this.gview.bpToPx(1));
        var zoomBP = scale > 1;

        $(featureDiv).resizable({
            handles: "e, w",
            helper:  "ui-resizable-helper",
            grid:    zoomBP && [scale, 1],  // [x, y]

            // resize is called during resize whenever resize handle is dragged.
            // We take advantage of that to draw a vertical line and indicate
            // base pair coordinate for reference.
            resize: _.bind(function (event, ui) {
                // If snapping, reset event.pageX so that the red vertical line
                // snaps as well.
                if (zoomBP) {
                    // if moving left
                    if (ui.position.left - ui.originalPosition.left) {
                        event.pageX = ui.position.left;
                    }
                    // if moving right
                    else if (ui.position.left + ui.size.width -
                                (ui.originalPosition.left +
                                ui.originalSize.width)) {
                        event.pageX = ui.position.left + ui.size.width;
                    }
                }

                // Draw vertical line with a base pair coordinate indicator.
                this.gview.drawVerticalPositionLine(this.div, event);
            }, this),

            // Calculate the final coordinates and accordingly modify the
            // feature, and do any necessary cleanup when resize ends.
            stop: _.bind(function (event, ui) {
                // Clear vertical line and base pair coordinate indicator.
                this.gview.clearVerticalPositionLine();
                this.gview.clearBasePairLabels();

                var exon       = ui.originalElement[0].subfeature;
                var transcript = exon.parent();

                var leftDeltaPixels  = ui.position.left - ui.originalPosition.left;
                var rightDeltaPixels = ui.position.left + ui.size.width - ui.originalPosition.left - ui.originalSize.width;
                var leftDeltaBases   = Math.round(this.gview.pxToBp(leftDeltaPixels));
                var rightDeltaBases  = Math.round(this.gview.pxToBp(rightDeltaPixels));

                var newLeft  = exon.get('start') + leftDeltaBases;
                var newRight = exon.get('end')   + rightDeltaBases;

                // FIXME:
                //   Should move this to a separate function.
                this.getRefSeq(function (refSeq) {
                    var newTranscript = this.resizeExon(refSeq, transcript, exon, newLeft, newRight);
                    newTranscript.set('name', transcript.get('name'));
                    this.replaceTranscript(transcript, newTranscript, function (t) {
                        _.each(this.filterExons(t), _.bind(function (f) {
                            if (this.areFeaturesOverlapping(exon, f)) {
                                this.highlightFeature(f);
                            }
                        }, this));
                    });
                });
            }, this)
        });
        event.stopPropagation();
    },

    /**
     *  Override superclass method to not interefere with mouse-down selection.
     */
    onFeatureClick: function(event) {
    },

    /* Initializing view, including wiring it to the controller ends here. */

    /* CONTROLLERS - bridge between the view and model layer */
    addDraggedFeatures: function (selection, transcript) {
        var transcripts = _.map(selection, _.bind(function (s) {
            return this.normalizeFeature(s.feature, s.track);
        }, this));
        if (transcript) {
            transcripts.push(transcript);
        }

        if (transcripts.length === 1) {
            this.insertTranscript(transcripts[0]);
            return;
        }

        var whichStrandModal   = $('#which-strand');
        var whichStrandButtons = $('#which-strand button');
        var proceedWithStrand  = _.bind(function (eventOrStrand) {
            whichStrandButtons.off('click', proceedWithStrand);
            var strand = (eventOrStrand instanceof $.Event) ?
                parseInt($(eventOrStrand.target).val()) : eventOrStrand;

            if (strand) {
                _.each(transcripts, _.bind(function (transcript, i) {
                    if (transcript.get('strand') !== strand) {
                        transcripts[i] = this.flipStrand(transcript);
                    }
                }, this));

                this.getRefSeq(function (refSeq) {
                    var newTranscript = this.mergeTranscripts(refSeq, transcripts);
                    if (transcript) {
                        this.replaceTranscript(transcript, newTranscript);
                    }
                    else {
                        this.insertTranscript(newTranscript);
                    }
                });
            }
        }, this);

        if (!this.areOnSameStrand(transcripts)) {
            whichStrandButtons.on('click', proceedWithStrand);
            whichStrandModal.modal();
        }
        else {
            var strand = transcripts[0].get('strand');
            proceedWithStrand.apply(this, [strand]);
        }
    },

    duplicateSelectedFeatures: function () {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();
        var transcripts = this.duplicateFeatures(selected);
        this.insertTranscripts(transcripts);
    },

    deleteSelectedFeatures: function () {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();

        this.getRefSeq(function (refSeq) {
            var transcriptsToRemove = [];
            var exonsToRemove       = [];
            var transcriptsToAlter  = [];
            var alteredTranscripts  = [];

            _.each(selected, function (feature) {
                var parent;
                if (parent = feature.parent()) {
                    exonsToRemove.push(feature);
                    transcriptsToAlter.push(parent);
                }
                else {
                    transcriptsToRemove.push(feature);
                }
            });
            transcriptsToAlter = _.uniq(transcriptsToAlter);
            _.each(transcriptsToAlter, _.bind(function (transcript) {
                var exonsToDelete     = this.filterSiblings(exonsToRemove, transcript);
                var alteredTranscript = this.deleteExons(refSeq, transcript, exonsToRemove);
                alteredTranscripts.push(alteredTranscript);
            }, this));

            this.deleteTranscripts(transcriptsToRemove);
            this.replaceTranscripts(transcriptsToAlter, alteredTranscripts);
        });
    },

    mergeSelectedFeatures: function ()  {
        var selected = this.selectionManager.getSelectedFeatures();
        this.selectionManager.clearSelection();

        this.getRefSeq(function (refSeq) {
            if (this.areSiblings(selected)) {
                var transcript    = selected[0].parent();
                var newTranscript = this.mergeExons(refSeq, transcript, selected);
                this.replaceTranscript(transcript, newTranscript);
            }
            else {
                var newTranscript = this.mergeTranscripts(refSeq, selected);
                this.replaceMergedTranscripts(selected, newTranscript);
            }
        });
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

    /**
     * NOTE: on setting translation start and stop, and longest ORF.
     *
     * We allow setting translation start and stop, and longest ORF even if the
     * user selected an exon. That is, the transcript to operate on is implied.
     * This is because at close to base pair zoom level the distinction,
     * whether exon is selected or transcript, is not apparent and thus not
     * intuitive why these menu items should be disabled.
     */
    setTranslationStartForImpliedTranscript: function () {
        var selected   = this.selectionManager.getSelectedFeatures();
        var transcript = EditTrack.getTopLevelAnnotation(selected[0]);
        this.selectionManager.clearSelection();

        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        this.getRefSeq(function (refSeq) {
            var newTranscript = this.setTranslationStart(refSeq, transcript, coordinate);
            this.replaceTranscript(transcript, newTranscript);
        });
    },

    setTranslationStopForImpliedTranscript: function () {
        var selected   = this.selectionManager.getSelectedFeatures();
        var transcript = EditTrack.getTopLevelAnnotation(selected[0]);
        this.selectionManager.clearSelection();

        var coordinate = this.gview.absXtoBp($('#contextmenu').position().left);
        var newTranscript = this.setTranslationStop(transcript, coordinate);
        this.replaceTranscript(transcript, newTranscript);
    },

    setLongestORFForImpliedTranscript: function () {
        var selected   = this.selectionManager.getSelectedFeatures();
        var transcript = EditTrack.getTopLevelAnnotation(selected[0]);
        this.selectionManager.clearSelection();

        this.getRefSeq(function (refSeq) {
            var newTranscript = this.setLongestORF(refSeq, transcript);
            if (newTranscript) {
                this.replaceTranscript(transcript, newTranscript);
            }
        });
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
        setTimeout(_.bind(function () {
            var features     = this.selectionManager.getSelectedFeatures();
            var sequenceType = $("#sequence .active").attr('data-sequence-type');

            this.getRefSeq(function (refSeq) {
                var fasta = [];

                _.each(features, _.bind(function (f) {
                    var name   = f.get('name');
                    var ref    = f.get('seq_id');
                    var strand = f.get('strand');

                    var seq, coords;
                    switch (sequenceType) {
                        case 'genomic':
                            var flank = $('#sequence #bp input[type=number]').val();
                            flank = flank ? parseInt(flank) : 0;

                            seq    = this.getSequence(refSeq, f, flank);
                            coords = [this.getCoordinates(f, {flank: flank, ignoreStrand: true})];
                            break;
                        case 'cDNA':
                            seq    = this.getCDNA(refSeq, f);
                            coords = this.getCDNACoordinates(f, {ignoreStrand: true});
                            break;
                        case 'CDS':
                            seq    = this.getCDS(refSeq, f);
                            coords = this.getCDSCoordinates(f, {ignoreStrand: true});
                            break;
                        case 'protein':
                            seq    = this.getProtein(refSeq, f);
                            coords = this.getCDSCoordinates(f, {ignoreStrand: true});
                            break;
                    };

                    if (seq) {
                        var _fasta = '>' + (name ? (name + ' ') : '')                                       // identifier    |
                        + ref + ':' + _.map(coords, function (c) { return c[0] + '..' + c[1]; }).join(',')  // coordinates   |
                        + '(' + (strand === 1 ? '+' : '-') + ')'                                            // strand        | defline
                        + ' ' + sequenceType                                                                // sequence type |
                        + ' ' + seq.length + (sequenceType === 'protein' ? 'aa' : 'bp')                     // length        |
                        + "\n"
                        + seq;

                        fasta.push(_fasta);
                    }
                }, this));

                $('#sequence').modal();
                $('#sequence pre').html(fasta.join("\n"));
                sequenceType === 'genomic' ? $('#bp').show() : $('#bp').hide();
                fasta.length === 0 ? $('#download').addClass('disabled') : $('#download').removeClass('disabled');
            });
        }, this), 0);

        if (!this._sequeceDialogInitialized) {
            $('#sequence input[type=number]').on('input', _.bind(function (e) {
                this.showSequenceDialog();
            }, this));
            this._sequeceDialogInitialized = true;
        }
    },

    downloadSequence: function () {
        setTimeout(_.bind(function () {
            var data = $('#sequence pre').text();
            var type = $("#sequence .active").attr('data-sequence-type');
            var file = 'afra-' + _.values(this.gview.visibleRegion()).join('_') + '-' + type +  '.fa';
            saveAs(new Blob([data], {type: 'text/plain'}), file);
        }, this), 0);
    },

    /* end CONTROLLERS - bridge between the view and model layer */

    /*******************************
     * Model layer.                *
     *******************************/
    generateName: function (feature) {
        return 'afra-' + feature.get('seq_id') + '-mRNA-' + counter++;
    },

    /**
     * Returns `true` if given features are overlapping.
     *
     * Only two features can be compare at a time.
     */
    areFeaturesOverlapping: function (feature1, feature2) {
        var features = this.sortAnnotationsByLocation([feature1, feature2]);
        var f1 = features[0];
        var f2 = features[1];
        if (f2.get('start') - f1.get('end') < 1) {
            return true;
        }
        return false;
    },

    /**
     * Select all features from an array of features or from subfeatures of the
     * given feature that are of the given type.
     */
    filterFeatures: function (features, type) {
        if (features instanceof SimpleFeature) {
            features = features.get('subfeatures');
        }
        return _.filter(features, function (f) {
            return f.get('type') === type;
        });
    },

    /**
     * Select exons from an array of features or subfeatures of the given
     * feature.
     */
    filterExons: function (features) {
        return this.filterFeatures(features, 'exon');
    },

    /**
     * Select CDS from an array of features or subfeatures of the given
     * feature.
     */
    filterCDS: function (features) {
        return this.filterFeatures(features, 'CDS');
    },

    /**
     * Sometimes we will have an array of subfeatures and want to select
     * those with a common parent.
     */
    filterSiblings: function (subfeatures, parent) {
        return _.filter(subfeatures, function (subfeature) {
            return subfeature.parent() === parent;
        });
    },

    /**
     * Select all features from an array of features or from subfeatures of the
     * given feature except of the given type.
     */
    rejectFeatures: function (features, type) {
        if (features instanceof SimpleFeature) {
            features = features.get('subfeatures');
        }
        return _.reject(features, function (f) {
            return f.get('type') === type;
        });
    },

    /**
     * Select all features from an array of features or from subfeatures of the
     * given feature except exons.
     */
    rejectExons: function (features) {
        return this.rejectFeatures(features, 'exon');
    },

    /**
     * Select all features from an array of features or from subfeatures of the
     * given feature except CDS.
     */
    rejectCDS: function (features) {
        return this.rejectFeatures(features, 'CDS');
    },

    /**
     * Set left / right coordiantes for the given exon in the given transcript.
     * If setting new coordinates causes the exon to overlap with its siblings,
     * they will be merged together.
     *
     * Returns new transcript. Returns `undefined` if the given exon is not a
     * part of the given transcript, or if the given exon is not really an exon.
     */
    resizeExon: function (refSeq, transcript, exonToResize, left, right) {
        if (exonToResize.parent() !== transcript ||
            exonToResize.get('type') !== 'exon') {
            return;
        }

        var _exons, exons = [];
        _exons = this.filterExons(transcript);
        _exons = _.reject(_exons, function (exon) { return exon === exonToResize; });
        if (left !== right) {
            _exons.push(this.copyFeature(exonToResize, {start: left, end: right}));
        }
        _exons = this.sortAnnotationsByLocation(_exons);
        _.each(_exons, _.bind(function (f) {
            var last = exons[exons.length - 1];
            if (last && (f.get('start') - last.get('end') <= 1)) {
                last.set('end', Math.max(last.get('end'), f.get('end')));
            }
            else {
                exons.push(this.copyFeature(f));
            }
        }, this));

        var newTranscript    = this.createTranscript(exons, transcript.get('name'));
        var translationStart = this.getTranslationStart(transcript);
        if (translationStart) {
            if (translationStart < newTranscript.get('start')) {
                translationStart = newTranscript.get('start');
            }
            if (translationStart > newTranscript.get('end')) {
                translationStart = newTranscript.get('end');
            }
            newTranscript = this.setORF(refSeq, newTranscript, translationStart);
        }
        return newTranscript;
    },

    /**
     * Returns a new transcript with the given exons merged into one. Returns
     * `undefined` if given exons are not all on the same transcript.
     *
     * If given transcript has CDS features, open reading frame of the new
     * transcript is re-calculated from the translation start site. If the
     * given transcript does not have CDS features, the resulting transcript
     * won't have any CDS features either.
     */
    mergeExons: function (refSeq, transcript, exonsToMerge) {
        if (!this.areSiblings(exonsToMerge)) {
            return;
        }

        var exons = _.reject(this.filterExons(transcript), function (exon) {
            return _.indexOf(exonsToMerge, exon) !== -1;
        });
        var min = _.min(_.map(exonsToMerge, function (exonToMerge) {
            return exonToMerge.get('start');
        }));
        var max = _.max(_.map(exonsToMerge, function (exonToMerge) {
            return exonToMerge.get('end');
        }));
        exons.push(this.copyFeature(exonsToMerge[0], {start: min, end: max}));

        var newTranscript    = this.createTranscript(exons);
        var translationStart = this.getTranslationStart(transcript);
        if (translationStart) {
            newTranscript = this.setORF(refSeq, newTranscript, translationStart);
        }
        newTranscript.set('name', transcript.get('name'));
        return newTranscript;
    },

    /* Duplicate given transcripts, or create a new transcript from given same
     * stranded subfeatures.
     */
    duplicateFeatures: function (features)  {
        var transcripts = [];
        var subfeatures = [];
        _.each(features, _.bind(function (f) {
            var parent;
            if ((parent = f.parent())) {
                subfeatures = subfeatures.concat(_.select(parent.get('subfeatures'), function (s) {
                    return (f.get('start') <= s.get('start') && f.get('end') >= s.get('end'));
                }));
            }
            else {
                var newTranscript = this.createTranscript(f.get('subfeatures'));
                transcript.set('name', this.generateName(transcript));
                transcripts.push(newTranscript);
            }
        }, this));

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

    /**
     * Returns a new transcript with the said exons deleted. Returns
     * `undefined` if transcript contains one exon only.
     *
     */
    deleteExons: function (refSeq, transcript, exonsToDelete)  {
        if (this.filterExons(transcript).length <= 1) {
            return;
        }

        var exons = _.reject(this.filterExons(transcript), function (exon) {
            return _.indexOf(exonsToDelete, exon) !== -1;
        });
        var newTranscript    = this.createTranscript(exons, transcript.get('name'));
        var translationStart = this.getTranslationStart(transcript);
        if (translationStart) {
            if (translationStart < newTranscript.get('start')) {
                translationStart = newTranscript.get('start');
            }
            if (translationStart > newTranscript.get('end')) {
                translationStart = newTranscript.get('end');
            }
            newTranscript = this.setORF(refSeq, newTranscript, translationStart);
        }
        return newTranscript;
    },

    /**
     * Merges given transcripts into a new transcript. Overlapping and adjacent
     * exons are combined into one.
     *
     * If the given transcripts don't have CDS features, merged transcript
     * won't have a CDS feature either.
     *
     * If the given transcripts have CDS features, open reading frame of merged
     * transcript is re-calculated from the left most or right most translation
     * start site (dependending on the strand), of the given transcripts.
     *
     * Returns a new tranascript. If transcripts are all not on the same strand,
     * returns `undefined`.
     */
    mergeTranscripts: function (refSeq, transcripts) {
        if (!this.areOnSameStrand(transcripts)) {
            return undefined;
        }

        var strand = transcripts[0].get('strand');
        var translationStart = _.map(transcripts, _.bind(function (transcript) {
            return this.getTranslationStart(transcript);
        }, this));
        translationStart = (strand === -1) ? _.max(translationStart) : _.min(translationStart);

        var exons = [];
        _.each(transcripts, _.bind(function (transcript) {
            exons = exons.concat(this.filterExons(transcript));
        }, this));
        exons = this.sortAnnotationsByLocation(exons);
        _.each(exons, _.bind(function (f) {
            var last = exons[exons.length - 1];
            if (last && (f.get('start') - last.get('end') <= 1)) { // we are looking for introns
                exons[exons.length - 1] = this.copyFeature(last, {end: Math.max(last.get('end'), f.get('end'))});
            }
            else {
                exons.push(f);
            }
        }, this));

        var newTranscript  = this.createTranscript(exons);
        newTranscript = this.setORF(refSeq, newTranscript, translationStart);
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

    /**
     * Recalculate reading frame of the given transcript from the given
     * coordinate.
     *
     * Returns new transcript.
     */
    setTranslationStart: function (refSeq, transcript, coordinate) {
        coordinate = Math.round(coordinate);
        return this.setORF(refSeq, transcript, coordinate);
    },

    /**
     * Forcibly extend or cut short reading frame of the given transcript to
     * the given coordinate.
     *
     * The transcript must already have CDS to extend or reduce.
     */
    setTranslationStop: function (transcript, coordinate) {
        coordinate = Math.round(coordinate);
        var newTranscript = this.setCDS(transcript, this.getTranslationStart(transcript), coordinate);
        return newTranscript;
    },

    /**
     * Find the longest ORF and accordingly sets whole CDS in the given
     * transcript.
     *
     * Returns new transcript.
     *
     * Returns `undefined` if no open reading frame found.
     *
     * If more than one longest ORF are found, the last one is taken.
     */
    setLongestORF: function (refSeq, transcript) {
        var cdna = this.getCDNA(refSeq, transcript);
        cdna = cdna.toLowerCase();

        var orfStart, orfStop, longestORF = 0;
        var startIndex = cdna.indexOf(CodonTable.START_CODON);
        while (startIndex >= 0) {
            var runningORF   = 0;
            var readingFrame = cdna.slice(startIndex);
            var stopCodon    = !_.every(readingFrame.match(/.../g), function (codon) {
                runningORF += 3;
                if (CodonTable.STOP_CODONS.indexOf(codon) !== -1) {
                    return false;
                }
                return true;
            });
            //console.log('reading frame:', startIndex, startIndex + runningORF, runningORF, stopCodon);
            if (stopCodon && (runningORF > longestORF)) {
                orfStart   = startIndex;
                orfStop    = orfStart + runningORF;
                longestORF = runningORF;
            }
            startIndex = cdna.indexOf(CodonTable.START_CODON, startIndex + 1);
        }

        if (longestORF) {
            orfStart = this.CDNAToTranscript(transcript, orfStart);
            orfStop  = this.CDNAToTranscript(transcript, orfStop);

            var newTranscript = this.setCDS(transcript, orfStart, orfStop);
            return newTranscript;
        }
    },

    /**
     * Set whole CDS from the annotated start codon to the first stop codon. If
     * stop codon not found, reading frame will extend from the start codon to
     * the end of transcript such that length of reading frame is a multiple of
     * 3.
     */
    setORF: function (refSeq, transcript, orfStart) {
        orfStart = orfStart || this.getTranslationStart(transcript);
        if (!orfStart) { return; }

        var cdna, orfStop, readingFrame;
        cdna          = this.getCDNA(refSeq, transcript).toLowerCase();
        orfStart      = this.transcriptToCDNA(transcript, orfStart);
        orfStop       = orfStart;
        readingFrame  = cdna.slice(orfStart);
        var stopCodon = !_.every(readingFrame.match(/.../g), function (codon) {
            orfStop += 3;
            if (CodonTable.STOP_CODONS.indexOf(codon) !== -1) {
                return false;
            }
            return true;
        });
        if (!stopCodon) {
            orfStop = cdna.length;
        }
        orfStart = this.CDNAToTranscript(transcript, orfStart);
        orfStop  = this.CDNAToTranscript(transcript, orfStop);

        var newTranscript = this.setCDS(transcript, orfStart, orfStop);
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
        data = data || {};
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

    /**
     * Returns one of [-3, -2, -1, 1, 2, 3], to indicate reading frame of the
     * given transcript.
     */
    getReadingFrame: function (transcript) {
        var strand = transcript.get("strand");
        if (strand === 1) {
            var frame = transcript.get('start') % 3;
            return frame + 1;
        }
        else if (strand === -1) {
            var frame = (this.refSeq.end - transcript.get('end')) % 3;
            return -(frame + 1);
        }
    },

    /* ------------------------------------------------------------------------
     * getXSequence
     * ------------------------------------------------------------------------
     */

    /* Get genomic sequence. */
    getSequence: function (refSeq, feature, flank) {
        var start = feature.get('start') - flank;
        var end   = feature.get('end') + flank;

        var seq   = refSeq.slice(start, end);
        if (feature.get('strand') == -1) {
            seq = Util.reverseComplement(seq)
        }

        return seq;
    },

    /* Get genomic sequence that will be transcribed. */
    getCDNA: function (refSeq, feature) {
        var transcript = EditTrack.getTopLevelAnnotation(feature);
        var fmin = feature.get('start');
        var fmax = feature.get('end');

        var cdna = [];
        _.each(transcript.get('subfeatures'), function (f) {
            if (f.get('type') === 'exon' && f.get('start') >= fmin && f.get('end') <= fmax) {
                var start = f.get('start');
                var end   = f.get('end');
                cdna.push(refSeq.slice(start, end));
            }
        });
        cdna = cdna.join('');
        if (feature.get('strand') == -1) {
            cdna = Util.reverseComplement(cdna);
        }

        return cdna;
    },

    /* Get genomic sequence that will be translated. */
    getCDS: function (refSeq, feature) {
        var transcript = EditTrack.getTopLevelAnnotation(feature);
        var fmin = feature.get('start');
        var fmax = feature.get('end');

        var cds = [];
        _.each(transcript.get('subfeatures'), function (f) {
            if (f.get('type') === 'CDS' && f.get('start') >= fmin && f.get('end') <= fmax) {
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

    /**
     * Get translated protein sequence for the given feature.
     */
    getProtein: function (refSeq, feature) {
        var cds = this.getCDS(refSeq, feature);

        var start = this.transcriptToCDS(EditTrack.getTopLevelAnnotation(feature), this.getFeatureStart(feature));
        if (start < 0) {
            start = 0;
        }
        var mod   = start % 3; // 0, 1, 2
        var phase = mod ? (3 - mod) : mod;

        cds = cds.slice(phase);
        return _.map(cds.match(/(...)/g), function (codon) {
            var aa = CodonTable[codon];
            if (!aa) {
                aa = "?";
            }
            return aa;
        }).join('');
    },

    /**
     * Returns first three characters of CDS.
     */
    getStartCodon: function (transcript, refSeq) {
        var cds = this.getCDS(refSeq, transcript);
        return cds.slice(0, 3);
    },

    /**
     * Returns last three in-frame characters of CDS.
     *
     * Equivalent to reading CDS in triplets and returning the last triplet
     * read.
     */
    getStopCodon: function (transcript, refSeq) {
        var cds      = this.getCDS(refSeq, transcript);
        var extra    = cds.length % 3;
        var frameEnd = cds.length - extra;
        return cds.slice(frameEnd - 3, frameEnd);
    },

    /* ------------------------------------------------------------------------
     * getXCoordinates functions below return coordinates on _refSeq_.
     * ------------------------------------------------------------------------
     */

    getCoordinates: function (feature, options) {
        options = options || {};
        var flank = options.flank;               // coordinates +/- flank
        var ignoreStrand = options.ignoreStrand; // ignore strand?

        var start = feature.get('start');
        var end   = feature.get('end');
        if (flank) {
            start = start - flank;
            end   = start + flank;
        }
        if (!ignoreStrand && feature.get('strand') === -1) {
            var temp = start;
            start = end;
            end   = temp;
        }

        return [start, end];
    },

    getCDNACoordinates: function (feature, options) {
        options = options || {};
        var ignoreStrand = options.ignoreStrand;

        var transcript = EditTrack.getTopLevelAnnotation(feature);
        var fmin = feature.get('start');
        var fmax = feature.get('end');
        var subfeatures = this.sortAnnotationsByLocation(transcript.get('subfeatures'));

        var cDNACoordinates = [];
        _.each(subfeatures, _.bind(function (f) {
            if (f.get('type') === 'exon' && f.get('start') >= fmin && f.get('end') <= fmax) {
                cDNACoordinates.push(this.getCoordinates(f, options));
            }
        }, this));
        if (!ignoreStrand && feature.get('strand') === -1) {
            cDNACoordinates.reverse();
        }

        return cDNACoordinates;
    },

    getCDSCoordinates: function (feature, options) {
        options = options || {};
        var ignoreStrand = options.ignoreStrand;

        var transcript = EditTrack.getTopLevelAnnotation(feature);
        var fmin = feature.get('start');
        var fmax = feature.get('end');
        var subfeatures = this.sortAnnotationsByLocation(transcript.get('subfeatures'));

        var cdsCoordinates = [];
        _.each(subfeatures, _.bind(function (f) {
            if (f.get('type') === 'CDS' && f.get('start') >= fmin && f.get('end') <= fmax) {
                cdsCoordinates.push(this.getCoordinates(f, options));
            }
        }, this));
        if (!ignoreStrand && feature.get('strand') === -1) {
            cdsCoordinates.reverse();
        }

        return cdsCoordinates;
    },

    getWholeCDSCoordinates: function (transcript) {
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

    /**
     * Returns translation start coordinate. Returns `undefined` if transcript
     * doesn't have CDS.
     */
    getTranslationStart: function (transcript) {
        return this.getWholeCDSCoordinates(transcript)[0];
    },

    /**
     * Returns translation start coordinate. Returns `undefined` if transcript
     * doesn't have CDS.
     */
    getTranslationStop: function (transcript) {
        return this.getWholeCDSCoordinates(transcript)[1];
    },

    /**
     * Returns start coordinate of the given feature if it's on forward strand.
     * Returns end   coordinate of the given feature if it's on reverse strand.
     *
     * Start coordinate is returned if it's not known which strand the feature
     * is on. That is, the feature is assumed to be on forward strand.
     */
    getFeatureStart: function (feature) {
        return feature.get('strand') === -1 ?
            feature.get('end') : feature.get('start');
    },

    /**
     * Returns end   coordinate of the given feature if it's on forward strand.
     * Returns start coordinate of the given feature if it's on reverse strand.
     *
     * End coordinate is returned if it's not known which strand the feature is
     * on. That is, the feature is assumed to be on forward strand.
     */
    getFeatureEnd:   function (feature) {
        return feature.get('strand') === -1 ?
            feature.get('start') : feature.get('end');
    },

    /**
     * For the given feature, return the length of genomic sequence that will
     * be transcribed. The same as `getCDNA(...).length`.
     */
    getCDNALength: function (feature) {
        var CDNACoordinates = this.getCDNACoordinates(feature);
        return _.reduce(CDNACoordinates, function (memo, pair) {
            return memo + (pair[0] - pair[1]);
        }, 0);
    },

    /**
     * For the given feature, return the length of genomic sequence that will
     * be translated. The same as `getCDS(...).length`.
     */
    getCDSLength: function (feature) {
        var cdsCoordinates = this.getCDSCoordinates(feature);
        return _.reduce(cdsCoordinates, function (memo, pair) {
            return memo + (pair[0] - pair[1]);
        }, 0);
    },

    /**
     * Return length of 5' UTR of the given transcript.
     */
    getFivePrimeUTRLength: function (transcript) {
        var transcriptStart  = this.getFeatureStart(transcript);
        var translationStart = this.getTranslationStart(transcript);
        return Math.abs(transcriptStart - translationStart);
    },

    /**
     * Return length of 3' UTR of the given transcript.
     */
    getThreePrimeUTRLength: function (transcript) {
        var transcriptEnd  = this.getFeatureEnd(transcript);
        var translationEnd = this.getTranslationStop(transcript);
        return Math.abs(transcriptEnd - translationEnd);
    },

    /**
     * Translates the given CDNA coordinate to transcript coordinate.
     *
     * Returns a number that will lie in the exonic region of the given
     * transcript.
     */
    CDNAToTranscript: function (transcript, coordinate) {
        var offset = transcript.get('start');
        var island = []; // coordinate range on mRNA (spliced) mapped to offset from start of pre-mRNA (non-spliced)
        var lastEnd, i = 0;
        _.each(transcript.get('subfeatures'), function (f) {
            if (f.get('type') === 'exon') {
                var start = f.get('start') - offset;
                var end   = f.get('end')   - offset;

                if (!lastEnd) { // first exon
                    island.push([end - start, 0]);
                }
                else { // second exon onwards
                    island.push([island[i - 1][0] + end - start, island[i - 1][1] + start - lastEnd]);
                }
                lastEnd = end;
                i++;
            }
        });

        if (transcript.get('strand') === -1) {
            var cdnaLength = this.getCDNALength(transcript);
            coordinate = cdnaLength - coordinate;
        }

        return (coordinate + offset + _.find(island, function (i) { if (i[0] >= coordinate) return i; })[1]);
    },

    /**
     * Translates the given transcript coordinate to CDNA coordinate.
     *
     * Returns a number between 0 and the length of CDNA of the given
     * transcript minus one (inclusive).
     */
    transcriptToCDNA: function (transcript, coordinate) {
        var offset = transcript.get('start');
        var island = []; // coordinate range on mRNA (spliced) mapped to offset from start of pre-mRNA (non-spliced)
        var lastEnd, i = 0;
        _.each(transcript.get('subfeatures'), function (f) {
            if (f.get('type') === 'exon') {
                var start = f.get('start') - offset;
                var end   = f.get('end')   - offset;

                if (!lastEnd) { // first exon
                    island.push([end - start, 0]);
                }
                else { // second exon onwards
                    island.push([island[i - 1][0] + end - start, island[i - 1][1] + start - lastEnd]);
                }
                lastEnd = end;
                i++;
            }
        });

        coordinate = coordinate - offset;
        coordinate = coordinate - _.find(island, function (i) { if ((coordinate - i[1]) <= i[0]) return i; })[1];

        if (transcript.get('strand') === -1) {
            var cdnaLength = this.getCDNALength(transcript);
            coordinate = cdnaLength - coordinate;
        }

        return coordinate;
    },

    CDNAToCDS: function (transcript, coordinate) {
        var fivePrimeUTRLength = this.getFivePrimeUTRLength(transcript);
        return coordinate - fivePrimeUTRLength;
    },

    CDSToCDNA: function (transcript, coordinate) {
        var fivePrimeUTRLength = this.getFivePrimeUTRLength(transcript);
        return coordinate + fivePrimeUTRLength;
    },

    transcriptToCDS: function (transcript, coordinate) {
        var onCDNA = this.transcriptToCDNA(transcript, coordinate);
        return this.CDNAToCDS(transcript, onCDNA);
    },

    CDSToTranscript: function (transcript, coordinate) {
        var onCDNA = this.CDSToCDNA(transcript, coordinate);
        return this.CDNAToTranscript(transcript, onCDNA);
    },

    /**
     * Given a transcript and whole CDS coordinates, insert CDS features in the
     * transcript. CDS features are created within exons boundaries.
     *
     * If the whole CDS coordinates do not fully lie within exon range, only
     * the part that lies within exon range will be used.  The function will
     * not add new nor alter existing exons.
     *
     * Returns new transcript.
     */
    setCDS: function (transcript, cdsStart, cdsEnd) {
        if (transcript.get('strand') == -1) {
            // simply swap start and stop
            var temp = cdsStart;
            cdsStart = cdsEnd;
            cdsEnd  = temp;
        }

        var subfeatures = this.rejectCDS(transcript);
        _.each(this.filterExons(transcript), _.bind(function (f) {
            if (f.get('end') >= cdsStart && f.get('start') <= cdsEnd) {
                var fmin = _.max([f.get('start'), cdsStart]);
                var fmax = _.min([f.get('end'),   cdsEnd  ]);
                subfeatures.push(this.copyFeature(f, {type: 'CDS', start: fmin, end: fmax}));
            }
        }, this));

        // return a new transcript
        return this.createTranscript(subfeatures, transcript.get('name'));
    },

    getRefSeq: function (callback) {
        this.browser.getStore('refseqs', _.bind(function(refSeqStore) {
            if (refSeqStore) {
                refSeqStore.getReferenceSequence(
                    {ref: this.refSeq.name, start: this.refSeq.start, end: this.refSeq.end},
                    _.bind(function (refSeq) {
                        callback.apply(this, [refSeq]);
                    }, this));
            }
        }, this));
    },

    /* ----------------------------- */
    /* Utility functions.
    /* ----------------------------- */

    /**
     * Returns `true` if given transcript has CDS, `false` otherwise.
     */
    hasCDS: function (transcript) {
        return !!_.find(transcript.get('subfeatures'), function (f) {
            return f.get('type') === 'CDS';
        });
    },

    /**
     * Returns `true` if given features are all on the same strand, `false`
     * otherwise.
     */
    areOnSameStrand: function (features) {
        var strand = _.map(features, function (feature) {
            return feature.get('strand');
        });
        return _.uniq(strand).length === 1;
    },

    /**
     * Returns `true` if given features are all top-level, i.e. they do not
     * have parent attribute set, `false` otherwise.
     */
    areToplevel: function (features) {
        return _.every(features, function (feature) {
            return !feature.parent();
        });
    },

    /**
     * Returns `true` if given features are all sub-features, i.e. they have
     * parent attribute set, `false` otherwise.
     */
    areSubfeatures: function (features) {
        return _.every(features, function (feature) {
            return !!feature.parent();
        });
    },

    /**
     * Returns `true` if all given features have the same parent, `false`
     * otherwise.
     *
     * Will return `false` if given features don't have parent attribute set.
     * True for transcripts.
     */
    areSiblings: function (features) {
        var parent_id = _.map(features, function (feature) {
            return (feature.parent() && feature.parent().id());
        });
        parent_id = _.uniq(parent_id);
        return (parent_id.length === 1 && !!parent_id[0]);
    },

    /* ----------------------------- */
    /* Validations.
    /* ----------------------------- */
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
                    end:   translationStart + (2 * transcript.get('strand')),
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
        var cdsLength = this.getCDSLength(transcript);
        if ((stopCodon && translationStop && !_.contains(CodonTable.STOP_CODONS, stopCodon.toLowerCase())) ||
           (cdsLength && (cdsLength % 3 !== 0))) {
            var coord = translationStop - transcript.get('strand');
            subfeatures.push(new SimpleFeature({
                data: {
                    start: translationStop,
                    end:   translationStop - (2 * transcript.get('strand')),
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

    /* end MODEL */

    /* VIEW HELPERS - update the view based on controller events */

    /**
     * Extend superclass' changed function to refresh our additions to the UI as
     * well.
     */
    changed: function () {
        this.inherited(arguments);

        this.updateControlButtons();
    },

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

        this.store.backupStore();
        try {
            this.getRefSeq(function (refSeq) {
                var inserted = [];
                _.each(transcripts, _.bind(function (toInsert) {
                    toInsert = this.markNonCanonicalSites(toInsert, refSeq);
                    this.store.insert(toInsert);
                    inserted.push(toInsert);
                }, this));
                this.changed();
                this.updateDoneButton();
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

        this.store.backupStore();
        try {
            var removed = [];
            _.each(transcripts, _.bind(function (t) {
                this.store.remove(t);
                removed.push(t);
            }, this));
            this.changed();
            this.updateDoneButton();
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

        this.store.backupStore();
        try {
            this.getRefSeq(function (refSeq) {
                var inserted = [];
                _.each(_.zip(transcriptsToRemove, transcriptsToInsert), _.bind(function (pair) {
                    var toRemove = pair[0];
                    var toInsert = pair[1];
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
        this.store.backupStore();
        try {
            this.store.remove(transcriptToRemove);
            this.getRefSeq(function (refSeq) {
                var inserted = [];
                _.each(transcriptsToInsert, _.bind(function (toInsert) {
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
        this.store.backupStore();
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
        this.store.undo();
        this.changed();
        this.updateDoneButton();
    },

    redo: function () {
        this.store.redo();
        this.changed();
        this.updateDoneButton();
    },

    updateDoneButton: function () {
        var $done = $('#done');
        if (this.store.features && this.store.features.length > 0) {
            $done.removeClass('disabled');
            return;
        }
        $done.addClass('disabled');
    },

    updateMenu: function() {
        this.updateMergeMenuItem();
        this.updateSplitTranscriptMenuItem();
        this.updateMakeIntronMenuItem();
        //this.updateDuplicateMenuItem();
        this.updateFlipStrandMenuItem();
        this.updateSetTranslationStartMenuItem();
        this.updateSetTranslationStopMenuItem();
        this.updateSetLongestORFMenuItem();
    },

    updateControlButtons: function() {
        this.updateUndoButton();
        this.updateRedoButton();
    },

    updateSetTranslationStartMenuItem: function () {
        var menuItem = $('#contextmenu-set-translation-start');
        var selected = this.selectionManager.getSelectedFeatures();
        if ((selected.length === 1 && this.areToplevel(selected)) ||
            this.areSiblings(selected)) {
            menuItem.removeClass('disabled');
            return;
        }
        menuItem.addClass('disabled');
    },

    updateSetTranslationStopMenuItem: function () {
        var menuItem = $('#contextmenu-set-translation-stop');
        var selected = this.selectionManager.getSelectedFeatures();
        if (((selected.length === 1 && this.areToplevel(selected)) ||
            this.areSiblings(selected)) &&
            this.hasCDS(EditTrack.getTopLevelAnnotation(selected[0]))) {
            menuItem.removeClass('disabled');
            return;
        }
        menuItem.addClass('disabled');
    },

    updateSetLongestORFMenuItem: function () {
        var menuItem = $('#contextmenu-set-longest-orf');
        var selected = this.selectionManager.getSelectedFeatures();
        if ((selected.length === 1 && this.areToplevel(selected)) ||
            this.areSiblings(selected)) {
            menuItem.removeClass('disabled');
            return;
        }
        menuItem.addClass('disabled');
    },

    updateMergeMenuItem: function () {
        var menuItem = $('#contextmenu-merge');
        var selected = this.selectionManager.getSelectedFeatures();
        if (selected.length < 2 ||
            (this.areToplevel(selected) && !this.areOnSameStrand(selected)) ||
            (this.areSubfeatures(selected) && !this.areSiblings(selected))) {
            menuItem.addClass('disabled')
            return;
        }
        menuItem.removeClass('disabled');
    },

    updateSplitTranscriptMenuItem: function() {
        var menuItem = $('#contextmenu-split');
        var selected = this.selectionManager.getSelectedFeatures();
        if (selected.length > 1 ||
            this.areSubfeatures(selected) ||
            (this.filterExons(selected[0]).length <= 1)) {
            menuItem.addClass('disabled');
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
            menuItem.addClass('disabled');
            return;
        }
        menuItem.removeClass("disabled");
    },

    updateUndoButton: function() {
        var toolbarButton = $("#controls-undo");
        if (this.store.undoStateStack && this.store.undoStateStack.length() > 0) {
            toolbarButton.removeClass("disabled");
            return;
        }
        toolbarButton.addClass("disabled");
    },

    updateRedoButton: function() {
        var toolbarButton = $("#controls-redo");
        if (this.store.redoStateStack && this.store.redoStateStack.length() > 0) {
            toolbarButton.removeClass("disabled");
            return;
        }
        toolbarButton.addClass("disabled");
    },

    //updateDuplicateMenuItem: function() {
        //var menuItem = $('contextmenu-duplicate');
        //var selected = this.selectionManager.getSelection();
        //var parent = EditTrack.getTopLevelAnnotation(selected[0].feature);
        //for (var i = 1; i < selected.length; ++i) {
            //if (EditTrack.getTopLevelAnnotation(selected[i].feature) != parent) {
                //menuItem.addClass('disabled')
                //return;
            //}
        //}
        //menuItem.removeClass('disabled')
    //},

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

        // Sometimes selection is made programatically using `addSelection`.
        // Like in hacks used to restore selection after JB redraws itself
        // (after move, zoom, etc.) or after double or triple click.
        // Though selection is restored, resizability isn't. The line below
        // serves to restore resizability in such situations.
        //
        // NOTE:
        //   I would think that this hack prevents users from selecting multiple
        //   features at bp level. Funnnily, that doesn't seem to be the case
        //   (verified against sevaral examples). And I don't know why.
        $(this.getFeatDiv(selection.feature)).mousedown();

        var feature = EditTrack.getTopLevelAnnotation(selection.feature);
        var featureDiv = this.getFeatDiv(feature);
        var seqTrack = this.browser.getSequenceTrack();
        if (featureDiv)  {
            var strand = feature.get('strand');

            var featureTop = $(featureDiv).position().top;
            var scale = this.gview.bpToPx(1);
            var charSize = seqTrack.getCharacterMeasurements();
            if (scale >= charSize.w && this.useResiduesOverlay)  {
                // Highlight reading frame.
                var readingFrame = this.getReadingFrame(feature);
                seqTrack.highlightRF(readingFrame);

                for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
                    this.browser.getStore('refseqs', _.bind(function(refSeqStore) {
                        if (refSeqStore) {
                            var block = this.blocks[bindex];
                            refSeqStore.getReferenceSequence(
                                {ref: this.refSeq.name, start: block.startBase, end: block.endBase},
                                function (seq) {
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
                    }, this));
                }
            }
        }

        this.updateMenu();
    },

    selectionRemoved: function (selection)  {
        var seqTrack = this.browser.getSequenceTrack();
        seqTrack.unhighlightRF();

        this.inherited(arguments);

        if (selection.track === this)  {
            $("div.sequence", this.div).remove();
        }

        var featureDiv  = this.getFeatDiv(selection.feature);
        var $featureDiv = $(featureDiv);
        if ($(featureDiv).hasClass('.ui-resizable')) {
            $featureDiv.resizable('destroy');
        }
    },
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
