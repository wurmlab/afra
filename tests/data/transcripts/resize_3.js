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
                    "end": 18869,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 18796,
                    "strand": -1,
                    "type": "exon"
                }
            },
            {
                "data": {
                    "end": 18869,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 18796,
                    "strand": -1,
                    "type": "CDS"
                }
            },
            {
                "data": {
                    "end": 19210 + 3,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 19075,
                    "strand": -1,
                    "type": "exon"
                }
            },
            {
                "data": {
                    "end": 19210 + 3,
                    "seq_id": "Si_gnF.scaffold02797",
                    "start": 19075,
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
