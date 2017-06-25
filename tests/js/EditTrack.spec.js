define([
        'underscore',
        'jquery',
        'JBrowse/Browser',
        'JBrowse/Model/SimpleFeature',
        '../tests/data/RefSeq_1',
        '../tests/data/RefSeq_2',
        '../tests/data/transcripts/transcript_data',
        '../tests/data/tracks',
        ], function (
            _,
            $,
            Browser,
            SimpleFeature,
            refSeq,
            refSeq_2,
            transcript_data,
            track
            ) {

describe( "Edit Track", function() {

    var baseURL = '/data/jbrowse/Solenopsis_invicta/Si_gnF';
    var jbrowse = new Browser({
        containerID: 'genome',
        baseUrl: baseURL,
        include: [baseURL + '/trackList.json', '/data/jbrowse/edit-track.json'],
        refSeqs: baseURL + '/seq/refSeqs.json'
    });

    var editTrack;
    var sortAnnotations = function(annots) {

        if (!_.isArray(annots)) return;

        return annots.sort(function(annot1, annot2) {
            var start1 = annot1.get("start");
            var end1 = annot1.get("end");
            var start2 = annot2.get("start");
            var end2 = annot2.get("end");
            var type1 = annot1.get("type");
            var type2 = annot2.get("type");

            if (start1 != start2)  { return start1 - start2; }
            else if (end1 != end2) { return end1 - end2; }
            else                   { if (type1 === type2) {
                                       return 0;
                                   }
                                   else {
                                       if(type1 < type2) {
                                           return -1;
                                       }
                                       else {
                                           return 1;
                                       }
                                   }
                               }
        });
    };

    /**
     * Returns `true` if the given SimpleFeature objects are "equal" and false
     * if they aren't.
     * Two SimpleFeature A and B are to be considered equal if
     * 1. If the type, start, end, strand and seq_id of A is same that of B.
     * 2. If any of A or B contains subfeatures then the set of subfeatures of
     *    A should be "equal" to the set of subfeatures of B.
     **/
    var compareFeatures = function(feature_a, feature_b) {
        var a = feature_a.data;
        var b = feature_b.data;

        if (a.type === b.type
                && a.seq_id === b.seq_id
                && a.start === b.start
                && a.end === b.end
                && a.strand === b.strand) {
            if (a.subfeatures !== undefined || b.subfeatures !== undefined) {
                return _.every(_.zip(sortAnnotations(a.subfeatures),
                            sortAnnotations(b.subfeatures)), function (sub_pair) {
                                return compareFeatures(sub_pair[0], sub_pair[1]);
                            });
            }
            return true;
        }
        return false;
    };

    beforeEach(function(done) {
        setTimeout(function () {
            editTrack = jbrowse.getEditTrack();
            done();
        }, 1000);
    });

    it( 'constructs', function() {
        expect(editTrack).toBeTruthy();
        expect(compareFeatures).toBeDefined();
        expect(refSeq).toBeDefined();
        expect(refSeq_2).toBeDefined();
        expect(transcript_data).toBeDefined();
        expect(track).toBeDefined();
    });

    it( 'tests comparison function', function() {
        expect(compareFeatures(transcript_data["input"][0], transcript_data["input"][0])).toBe(true);
    });

    it('tests getWholeCDSCoordinates', function() {
        expect(editTrack.getWholeCDSCoordinates(transcript_data.input[0])).toEqual([undefined, undefined]);
        expect(editTrack.getWholeCDSCoordinates(transcript_data.input[1])).toEqual([19977, 18796]);
    });

    it('tests flipStrand', function() {
        expect(editTrack.flipStrand(transcript_data.input[0]).get('strand')).toEqual(-1);
    });

    it('tests transcriptToCDNA', function() {
        expect(editTrack.transcriptToCDNA(transcript_data.input[3], 4)).toEqual(0);
    });

    it('tests CDNAToTranscript', function() {
        expect(editTrack.CDNAToTranscript(transcript_data.input[3], 0)).toEqual(4);
    });

    it('tests getCDNA', function() {
        expect(editTrack.getCDNA(refSeq_2, transcript_data.input[2])).toEqual(refSeq_2.slice(1));
    });

    it('tests getCDS', function() {
        expect(editTrack.getCDS(refSeq_2, transcript_data.input[2])).toEqual(refSeq_2.slice(1));
    });


    it ('test setORF', function() {
        expect(compareFeatures(
                editTrack.setORF(refSeq_2, transcript_data.input[2]),
                transcript_data.orf[0])).toBe(true);

        expect(compareFeatures(
                editTrack.setORF(refSeq_2, transcript_data.input[3]),
                transcript_data.orf[1])).toBe(true);
    });

    it ('tests setCDS', function() {
        expect(compareFeatures(
                editTrack.setCDS(transcript_data.input[4], 0, 24),
                transcript_data.cds[0])).toBe(true);
    });

    it( 'tests resizeExon', function() {
        exon = editTrack.filterExons(transcript_data["input"][0])[0];
        var right = 17120;
        var left = exon.get('start');
        outTranscript = editTrack.resizeExon(refSeq, transcript_data["input"][0], exon, left, right);
        expect(compareFeatures(transcript_data["resize"][0], outTranscript)).toBe(true);

        exon = editTrack.filterExons(transcript_data["input"][1])[1];
        var right = exon.get('end') + 3;
        var left = exon.get('start');
        outTranscript = editTrack.resizeExon(refSeq, transcript_data["input"][1], exon, left, right);
        expect(compareFeatures(transcript_data["resize"][2], outTranscript)).toBe(true);
    });

    it( 'tests areOnSameStrand', function() {
        expect(editTrack.areOnSameStrand([transcript_data.input[0], transcript_data.input[2]])).toBe(true);
        expect(editTrack.areOnSameStrand([transcript_data.input[0], transcript_data.input[1]])).toBe(false);
    });

    it( 'tests mergeTranscripts', function() {
        expect(compareFeatures(
                editTrack.mergeTranscripts(refSeq_2,
                    [transcript_data.input[7], transcript_data.input[7]]),
                transcript_data.input[7])).toBe(true);

        expect(compareFeatures(
                editTrack.mergeTranscripts(refSeq_2,
                    [transcript_data.input[6], transcript_data.input[7]]),
                transcript_data.input[6])).toBe(true);

            expect(compareFeatures(
                    editTrack.mergeTranscripts(refSeq_2,
                        [transcript_data.input[4], transcript_data.input[5]]),
                    transcript_data.merge[0])).toBe(true);

    });

    it( 'tests normalizeFeature', function() {
        exon = editTrack.filterExons(transcript_data.input[7])[0];
        expect(compareFeatures(
                editTrack.normalizeFeature(exon, track),
                transcript_data.normalize[0])).toBe(true);
    });
});
});
