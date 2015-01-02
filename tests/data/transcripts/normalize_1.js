define([
        'JBrowse/Model/SimpleFeature'
        ],
function (SimpleFeature) {
    var feature = {
    "data": {
    "seq_id": "testRefSeq2",
        "end": 13,
        "start": 1,
        "strand": 1,
        "subfeatures": [
            {
                "data": {
    "seq_id": "testRefSeq2",
                    "end": 13,
                    "start": 1,
                    "strand": 1,
                    "type": "exon"
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
