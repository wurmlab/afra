define(
function () {

    return ['$http', '$location', function (http, location) {
        this.location = location;
    }];
});
