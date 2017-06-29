define([
        'JBrowse/Model/SimpleFeature'
        ],
function (SimpleFeature) {
    // This transcript is corresponding to RefSeq_2
    // which is located in file data/RefSeq_2.js
    var feature = {
    "data": {
        "seq_id": "testRefSeq2",
        "end": 33,
        "start": 21,
        "strand": 1,
        "subfeatures": [
            {
                "data": {
                    "seq_id": "testRefSeq2",
                    "end": 33,
                    "start": 21,
                    "strand": 1,
                    "type": "exon"
                }
            },
            {
                "data": {
                    "seq_id": "testRefSeq2",
                    "end": 33,
                    "start": 21,
                    "strand": 1,
                    "type": "CDS"
                }
            }
        ],
        "type": "transcript"
    },
    "normalized": true,
};

var transcript = SimpleFeature.fromJSON(feature);
return transcript;
});
