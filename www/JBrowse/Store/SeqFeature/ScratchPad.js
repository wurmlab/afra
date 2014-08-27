define(['underscore', 'dojo/_base/declare', 'JBrowse/Store/SeqFeature']
, function(_, declare, SeqFeatureStore) {

    return declare(SeqFeatureStore, {

        constructor: function (args) {
            this.refSeq   = args.refSeq;
            this.features = [];
            this._calculateStats();
        },

        insert: function (feature) {
            this.features.push(feature);
            this._calculateStats();
        },

        replace: function (feature) {
            var index = _.indexOf(this.ids(), feature.id());
            this.features[index] = feature;
            this._calculateStats();
        },

        remove: function (feature) {
            var index = _.indexOf(this.ids(), feature.id());
            this.features.splice(index, 1);
            this._calculateStats();
        },

        get: function (id) {
            return _.find(this.features, function (f) {
                return f.id() === id;
            });
        },

        ids: function () {
            return _.map(this.features, function (f) {return f.id();});
        },

        _calculateStats: function () {
            var minStart = Infinity;
            var maxEnd = -Infinity;
            var featureCount = 0;
            _.each(this.features, function (f) {
                var s = f.get('start');
                var e = f.get('end');
                if (s < minStart)
                    minStart = s;

                if (e > maxEnd)
                    maxEnd = e;

                featureCount++;
            });

            this.globalStats = {
                featureDensity: featureCount / (this.refSeq.end - this.refSeq.start + 1),
                featureCount:   featureCount,
                minStart:       minStart,            /* 5'-most feature start */
                maxEnd:         maxEnd,              /* 3'-most feature end   */
                span:           (maxEnd-minStart+1)  /* min span containing all features */
            };
        },

        getFeatures: function (query, featCallback, endCallback, errorCallback) {
            var start = query.start;
            var end   = query.end;
            _.each(this.features, _.bind(function (f) {
                if (!(f.get('end') < start || f.get('start') > end)) {
                    featCallback(f);
                }
            }, this));
            if (endCallback)  { endCallback() }
        }
    });
});
