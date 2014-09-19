require(['JBrowse/Store/LazyArray']
, function (LazyArray) {

    describe("LazyArray with test data",
    function () {
        var la;

        beforeEach(function() {
            la = new LazyArray({
                                urlTemplate: "../data/lazyarray-{chunk}.json",
                                length: 12,
                                chunkSize: 5
                            });
                });

        it("should have length 12", function() {
            expect(la.length).toEqual(12);
        });

        it("should have \"zero\" at index 0", function (done) {
            la.index(0, function (i, value, param) {
                expect(i).toEqual(0);
                done();
            });
        });

        it("should have \"five\" at index 5", function (done) {
            la.index(5, function (i, value, param) {
                expect(i).toEqual(5);
                done();
            });
        });

        it("should run a range call properly", function (done) {
            // NOTE: async calls can return in any order.
            var chunks = [3, 4, 5, 6, 7];
            la.range(3, 7, function (i, value, param) {
                expect(_.contains(chunks, i)).toBe(true);
                chunks.splice(_.indexOf(chunks, i), 1);

                var c = [4, 5];
                la.range(4, 5, function (j, v, p) {
                    expect(_.contains(c, j)).toBe(true);
                    c.splice(_.indexOf(c, j), 1);
                });
            }, done);
        });
    });
});
