define(['jquery', 'dojo/_base/declare', 'JBrowse/Model/SimpleFeature', 'JBrowse/Store/SeqFeature']
, function ($, declare, SimpleFeature, SeqFeatureStore) {

    return declare(SeqFeatureStore,
    {
        getFeatures: function(query, featureCallback, endCallback, errorCallback) {
            var url = 'features/' + query.ref + ':' + query.start + '..' + query.end;
            $.getJSON(url, function (features) {
                for(var i = 0; i < features.length; i++) {
                    var feature = features[i];
                    featureCallback(new SimpleFeature({data: feature}));
                }
            });

            endCallback();
        }
    });
});
