define([
        'JBrowse/Model/SimpleFeature'
        ],
function (SimpleFeature) {
    // This transcript is corresponding to RefSeq
    // which is located in file data/RefSeq.js
    var feature = {
  "data": {
    "type": "transcript",
    "seq_id": "Si_gnF.scaffold02797",
    "strand": -1,
    "subfeatures": [
      {
        "data": {
          "type": "exon",
          "name": "undefined:exon1",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 18796,
          "end": 18869
        },
        "_uniqueID": "SimpleFeature_72"
      },
      {
        "data": {
          "type": "exon",
          "name": "undefined:exon2",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 19075,
          "end": 19210
        },
        "_uniqueID": "SimpleFeature_73"
      },
      {
        "data": {
          "type": "exon",
          "name": "undefined:exon3",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 19819,
          "end": 19977
        },
        "_uniqueID": "SimpleFeature_74"
      },
      {
        "data": {
          "type": "CDS",
          "name": "undefined:CDS1",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 18796,
          "end": 18869
        },
        "_uniqueID": "SimpleFeature_75"
      },
      {
        "data": {
          "type": "CDS",
          "name": "undefined:CDS2",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 19075,
          "end": 19210
        },
        "_uniqueID": "SimpleFeature_76"
      },
      {
        "data": {
          "type": "CDS",
          "name": "undefined:CDS3",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 19819,
          "end": 19977
        },
        "_uniqueID": "SimpleFeature_77"
      }
    ],
    "start": 18796,
    "end": 19977
  },
  "_uniqueID": "SimpleFeature_71"
};

var transcript = SimpleFeature.fromJSON(feature);
return transcript;
});