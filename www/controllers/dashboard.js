define(['bootstrap'],
function () {

    // route data for angular to resolve this module
    return ['$http', function (http) {
        var scope = this;

        http.get('/data/users/' + scope.user.id + '/contributions')
        .then(function (response) {
            var contributions = response.data;

            contributions = _.groupBy(contributions, function (contribution) {
                return contribution.task_type;
            });

            // DUMMY DATA
            contributions['Review'] = [{
                status: 'submitted',
                description: 'foo bar'
            }];
            // DUMMY DATA

            scope.contributions = contributions;
        });
    }];
});

