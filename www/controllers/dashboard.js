define(['bootstrap'],
function () {

    // route data for angular to resolve this module
    return ['$http', function (http) {
        var scope = this;

        scope.describe_contribution = function (contribution) {
            var species = contribution.task.for_species;
            species = species.split('_').join(' ');
            return "Corrections to <em>" + species + "</em> gene.";
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
