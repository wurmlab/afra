define( [
            'dojo/_base/declare',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Util',
            'JBrowse/CodonTable'
        ],
        function(declare, BlockBased, ExportMixin, Util, CodonTable) {

return declare( [BlockBased, ExportMixin],
 /**
  * @lends JBrowse.View.Track.Sequence.prototype
  */
{
    /**
     * Track to display the underlying reference sequence, when zoomed in
     * far enough.
     *
     * @constructs
     * @extends JBrowse.View.Track.BlockBased
     */
    constructor: function( args ) {
        this.trackPadding = 0;
    },

    _defaultConfig: function() {
        return {
            trackPadding: 0,
            maxExportSpan: 500000,
            showReverseStrand: true,
            showProteinTranslation: true
        };
    },
    _exportFormats: function() {
        return [{name: 'FASTA', label: 'FASTA', fileExt: 'fasta'}];
    },

    endZoom: function(destScale, destBlockBases) {
        this.clear();
    },

    setViewInfo:function(genomeView, heightUpdate, numBlocks,
                         trackDiv,
                         widthPct, widthPx, scale) {
        this.inherited( arguments );
        this.show();
    },

    nbsp: String.fromCharCode(160),

    fillBlock:function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;

        var charSize = this.getCharacterMeasurements();

        // if we are zoomed in far enough to draw bases, then draw them
        if (scale >= charSize.w) {
            this.show();
            this.store.getFeatures({
                ref: this.refSeq.name,
                start: leftBase - 2,
                end: rightBase + 2
            },
            dojo.hitch(this, '_fillBlock', block),
            function() {});
            this.heightUpdate(charSize.h * 8, blockIndex);
        }
        // otherwise, hide the track
        else {
            this.hide();
            this.heightUpdate(0);
        }
        args.finishCallback();
    },

    _fillBlock: function(block, feature) {
        var seq = feature.get('seq');
        var start = feature.get('start');
        var end = feature.get('end');

        // Pad with blanks if the sequence does not extend all the way across
        // our range.
        if (start < this.refSeq.start) {
            while( seq.length < (end-start) ) {
                seq = this.nbsp+seq;
            }
        }
        else if (end > this.refSeq.end) {
            while( seq.length < (end-start) ) {
                seq += this.nbsp;
            }
        }

        // make a div to contain the sequences
        var seqNode = document.createElement("div");
        seqNode.className = "sequence";
        seqNode.style.width = "100%";
        block.domNode.appendChild(seqNode);

        var blockStart = start + 2;
        var blockEnd = end - 2;
        var blockResidues = seq.substring(2, seq.length-2);
        var blockLength = blockResidues.length;
        var extendedStart = start;
        var extendedEnd = end;
        var extendedStartResidues = seq.substring(0, seq.length-2);
        var extendedEndResidues = seq.substring(2);

        // show translation for forward strand
        if (this.config.showProteinTranslation) {
            var framedivs = [];
            for (var i=0; i<3; i++) {
                // var tstart = start + i;
                var tstart = blockStart + i;
                var frame = tstart % 3;
                var transProtein = this.renderTranslation(extendedEndResidues, i, blockLength);
                $(transProtein).addClass("frame" + frame);
                framedivs[frame] = transProtein;
            }
            for (var i=2; i>=0; i--) {
                var transProtein = framedivs[i];
                seqNode.appendChild(transProtein);
                //$(transProtein).bind("mousedown", this.residuesMouseDown);
                //blockHeight += proteinHeight;
            }
        }

        // show forward strand
        seqNode.appendChild(this._renderSeqDiv(blockResidues));

        // and the reverse strand
        if (this.config.showReverseStrand) {
            var comp = this._renderSeqDiv(Util.complement(blockResidues));
            comp.className = 'revcom';
            seqNode.appendChild( comp );
        }

        // show translation for reverse strand
        if (this.config.showProteinTranslation && this.config.showReverseStrand) {
            var extendedReverseComp = Util.reverseComplement(extendedStartResidues);
            var framedivs = [];
            for (var i=0; i<3; i++) {
                var tstart = blockStart + i;
                var frame = (this.refSeq.length - blockEnd + i) % 3;
                frame = (Math.abs(frame - 2) + (this.refSeq.length % 3)) % 3;
                var transProtein = this.renderTranslation(extendedStartResidues, i, blockLength, true);
                $(transProtein).addClass("frame" + frame);
                framedivs[frame] = transProtein;
            }
            for (var i=0; i<3; i++) {
                var transProtein = framedivs[i];
                seqNode.appendChild(transProtein);
                //$(transProtein).bind("mousedown", track.residuesMouseDown);
                //blockHeight += proteinHeight;
            }
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
            base.className = 'base';
            base.style.width = charWidth;
            base.innerHTML = seq.charAt(i);
            container.appendChild(base);
        }
        return container;
    },

    renderTranslation: function (input_seq, offset, blockLength, reverse) {
        var seq;
        if (reverse) {
            seq = Util.reverseComplement(input_seq);
        }
        else  {
            seq = input_seq;
        }
        var container  = document.createElement("div");
        $(container).addClass("aa-residues");
        //$(container).addClass("offset" + offset);
        var prefix = "";
        var suffix = "";
        for (var i=0; i<offset; i++) { prefix += this.nbsp; }
        for (var i=0; i<(2-offset); i++) { suffix += this.nbsp; }

        var extra_bases = (seq.length - offset) % 3;
        var dnaRes = seq.substring(offset, seq.length - extra_bases);
        var aaResidues = dnaRes.replace(/(...)/gi,  function(codon) {
            var aa = CodonTable[codon];
            // if no mapping and blank in codon, return blank
            // if no mapping and no blank in codon,  return "?"
            if (!aa) {
                if (codon.indexOf(this.nbsp) >= 0) { aa = this.nbsp; }
                else  { aa = "?"; }
            }
            return prefix + aa + suffix;
        });
        var trimmedAaResidues = aaResidues.substring(0, blockLength);
        aaResidues = trimmedAaResidues;
        if (reverse) {
            var revAaResidues = Util.reverse(aaResidues);
            aaResidues = revAaResidues;
            while (aaResidues.length < blockLength)  {
                aaResidues = this.nbsp + aaResidues;
            }
        }
        var charWidth = 100/blockLength+"%";
        for (var i=0; i < aaResidues.length; i++) {
            var base = document.createElement('span');
            var aa = aaResidues.charAt(i)
            base.className = 'acid' + ' acid_' + aa;
            base.style.width = charWidth;
            base.innerHTML = aa;
            container.appendChild(base);
        }
        return container;
    },

    /**
     * @returns {Object} containing <code>h</code> and <code>w</code>,
     *      in pixels, of the characters being used for sequences
     */
    getCharacterMeasurements: function() {
        if (!this._measurements)
            this._measurements = this._measureSequenceCharacterSize(this.div);
        return this._measurements;
    },

    /**
     * Conducts a test with DOM elements to measure sequence text width
     * and height.
     */
    _measureSequenceCharacterSize: function (containerElement) {
        var widthTest = document.createElement("div");
        widthTest.className = "sequence";
        widthTest.style.visibility = "hidden";
        var widthText = "12345678901234567890123456789012345678901234567890";
        widthTest.appendChild(document.createTextNode(widthText));
        containerElement.appendChild(widthTest);
        var result = {
            w:  widthTest.clientWidth / widthText.length,
            h: widthTest.clientHeight
        };
        containerElement.removeChild(widthTest);
        return result;
  }
});
});
