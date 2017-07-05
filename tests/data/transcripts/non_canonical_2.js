define([
        'JBrowse/Model/SimpleFeature'
        ],
function (SimpleFeature) {
    // This transcript is corresponding to RefSeq
    // which is located in file data/RefSeq.js
    // This consist a both start/stop non canonical sites
    var feature = {
  "data": {
    "type": "transcript",
    "name": "maker-Si_gnF%2Escaffold02797-snap-gene-10.47-mRNA-1",
    "seq_id": "Si_gnF.scaffold02797",
    "strand": -1,
    "subfeatures": [
      {
        "data": {
          "type": "exon",
          "name": "maker-Si_gnF%2Escaffold02797-snap-gene-10.47-mRNA-1:exon1",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 994150,
          "end": 994370
        },
        "_uniqueID": "SimpleFeature_1054"
      },
      {
        "data": {
          "type": "CDS",
          "name": "maker-Si_gnF%2Escaffold02797-snap-gene-10.47-mRNA-1:CDS1",
          "seq_id": "Si_gnF.scaffold02797",
          "strand": -1,
          "start": 994150,
          "end": 994370
        },
        "_uniqueID": "SimpleFeature_1055"
      }
    ],
    "start": 994150,
    "end": 994370
  },
  "_uniqueID": "SimpleFeature_1053"
};

var transcript = SimpleFeature.fromJSON(feature);
return transcript;
});