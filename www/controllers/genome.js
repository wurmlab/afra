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

        http.get('/data/users').then(function (response) {
            scope.users = response.data;
            _.each(scope.users, function (user) {
                http.get('/data/users/' + user.id + '/contributions')
                .then(function (response) {
                    user.contributions = response.data;
                });
            });
        });
    }];
});
