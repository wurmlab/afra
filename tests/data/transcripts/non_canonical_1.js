define([
        'JBrowse/Model/SimpleFeature'
        ],
function (SimpleFeature) {
    // This transcript is corresponding to RefSeq
    // which is located in file data/RefSeq.js
    // This consist a non canonical stop site
    var feature = {
  "data": {
    "type": "transcript",
    "name": "maker-Si_gnF%2Escaffold02797-augustus-gene-9.30-mRNA-1",
    "seq_id": "Si_gnF.scaffold02797",
    "strand": -1,
    "subfeatures": [
      {
        "data": {
          "type": "exon",
          "name": "maker-Si_gnF%2Escaffold02797-augustus-gene-9.30-mRNA-1:exon1",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 981763,
          "end": 982146
        },
        "_uniqueID": "SimpleFeature_128"
      },
      {
        "data": {
          "type": "CDS",
          "name": "maker-Si_gnF%2Escaffold02797-augustus-gene-9.30-mRNA-1:CDS1",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 981763,
          "end": 981913
        },
        "_uniqueID": "SimpleFeature_129"
      }
    ],
    "start": 981763,
    "end": 982146
  },
  "_uniqueID": "SimpleFeature_127"
};

var transcript = SimpleFeature.fromJSON(feature);
return transcript;
});