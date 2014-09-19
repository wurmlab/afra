require([
    'dojo/_base/lang',
    'JBrowse/Store/SeqFeature/REST'
]
, function(lang, RESTStore) {

    function testWithConfig(config) {
        var store = new RESTStore({
            browser: {},
            baseUrl: '../data/rest_store_test',
            refSeq: { name: 'ctgA', start: 1, end: 500001 },
            config: config || {}
        });

        return function() {
            it( 'constructs', function() {
                expect( store ).toBeTruthy();
            });

            it('loads some data', function (done) {
                var features = [];
                store.getFeatures({start: 0, end: 50000},
                                function (feature) { features.push(feature); },
                                function () {
                                    expect(features.length).toEqual(6);
                                    expect(features[0].get('start')).toEqual( 1 );
                                    expect(features[4].children().length).toEqual( 2 );
                                    expect(features[4].children()[1].children()[0].get('type')).toEqual( 'SNV' );
                                    done();
                                });
            });

            it('supports global stats', function (done) {
                store.getGlobalStats(function (stats) {
                    expect(stats.featureDensity).toEqual(20);
                    done();
                });
            });

            it('emulates region stats', function (done) {
                store.getRegionStats({start: 0, end: 50000},
                                    function (stats) {
                                        expect(stats.featureDensity).toEqual( 0.00012 );
                                        done();
                                    });
            });
        };
    };

    describe('REST store', testWithConfig({ foo: 1 }));
    describe('REST store with nocache', testWithConfig({noCache: true, foo: 2}));
});
