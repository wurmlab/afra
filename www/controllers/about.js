define(['bootstrap'],
function () {

    return ['$http', '$location', function (http, location) {
        var scope = this;
        scope.location = location;

        scope.signup = function () {
            var form = $('form');
            var form_data = form.serialize();
            http.post('signup', form_data,
                      {
                          headers: {
                              'Content-Type': 'application/x-www-form-urlencoded'
                          }
                      })
            .then(function () {
                scope.response = 200;
            });
        };

        var facebook_auth_callback = function (response) {
            var auth = response.authResponse;
            if (auth) {
                var uid = auth.id;
            }
        };

        scope.signin_fb = function () {
            FB.login(facebook_auth_callback, { scope: 'email' });
        };
    }];
});
