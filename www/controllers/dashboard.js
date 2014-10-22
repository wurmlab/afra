define(['bootstrap'],
function () {

    // route data for angular to resolve this module
    return ['$http', function (http) {
        var scope = this;

        http.get('/data/users/' + scope.user.id + '/contributions')
        .then(function (response) {
            scope.contributions = response.data;
            scope.has_contributions = function () {
                return !$.isEmptyObject(scope.contributions);
            }
        });
    }];
});
