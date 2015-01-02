define([
        'JBrowse/Model/SimpleFeature'
        ],
function (SimpleFeature) {
    var feature = {
    "data": {
        "end": 19977,
        "seq_id": "Si_gnF.scaffold02797",
        "start": 18796,
        "strand": -1,
        "subfeatures": [
            {
                "data": {
                    "end": 19210,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 18796,
                    "strand": -1,
                    "type": "exon"
                }
            },
            {
                "data": {
                    "end": 19210,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 19071, // verify that there is a stop codon at this location
                    "strand": -1,
                    "type": "CDS"
                }
            },
            {
                "data": {
                    "end": 19977,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 19819,
                    "strand": -1,
                    "type": "exon"
                }
            },
            {
                "data": {
                    "end": 19977,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 19819,
                    "strand": -1,
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
