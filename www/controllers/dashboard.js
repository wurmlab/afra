define(['bootstrap'],
function () {

    // route data for angular to resolve this module
    return ['$http', function (http) {
        var scope = this;

        scope.describe_contribution = function (contribution) {
            var task = contribution.task;
            var species, locus;
            species = task.for_species;
            species = species.split('_').join(' ');
            locus   = task.ref_seq_id + ':' + task.start + '..' + task.end;
            return "Corrections to <em>" + species + "</em> gene (" + locus + ").";
        };

        http.get('/data/users/' + scope.user.id + '/contributions')
        .then(function (response) {
            scope.contributions = response.data;
            scope.has_contributions = function () {
                return !$.isEmptyObject(scope.contributions);
            }
        });
    }];
});
