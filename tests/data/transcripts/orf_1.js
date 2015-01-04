define([
        'JBrowse/Model/SimpleFeature'
        ],
function (SimpleFeature) {
    // This transcript is corresponding to RefSeq_2
    // which is located in file data/RefSeq_2.js
    var feature = {
    "data": {
    "seq_id": "testRefSeq2",
        "end": 46,
        "start": 1,
        "strand": 1,
        "subfeatures": [
            {
                "data": {
    "seq_id": "testRefSeq2",
                    "end": 34,
                    "start": 1,
                    "strand": 1,
                    "type": "CDS"
                }
            },
            {
                "data": {
    "seq_id": "testRefSeq2",
                    "end": 46,
                    "start": 1,
                    "strand": 1,
                    "type": "exon"
                }
            }
        ],
        "type": "transcript"
    }
};

var transcript = SimpleFeature.fromJSON(feature);
return transcript;
});
