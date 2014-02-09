require 'omniauth'
require 'omniauth-facebook'

class Auth < App::Routes

  use Rack::Session::Cookie,
    key:          'afra.session',
    secret:       Setting.get('session_secret'),
    expire_after: 2592000 # 1 month

  post '/signup' do
    email = params.fetch 'email'
    if email =~ /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b/i
      user  = User.first(email: email)
      unless user
        name = params.fetch 'name'
        User.create(name: name, email: email)
      end
    end
    200
  end

  post '/signin' do
    email = params.fetch 'email'
    if email =~ /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b/i
      user = User.where(password: nil).invert.first(email: email)
      if user
        password = params.fetch 'password'
        if user.authenticate(password)
          token = AccessToken.generate(user)
          request.session[:token] = token
          halt user.to_json only: [:id, :name, :picture, :joined_on]
        end
      end
    end
    401
  end

  ## 3rd party authentication

  # get '/auth/facebook' do
  # end
  use OmniAuth::Strategies::Facebook,
    Setting.get('facebook_app_id'),
    Setting.get('facebook_app_secret'),
    scope: 'email', # https://developers.facebook.com/docs/reference/api/permissions/
    display: 'popup'

  get '/auth/:provider/callback' do
    content_type 'application/json'
    auth  = request.env['omniauth.auth']
    email = auth.info.email
    user  = User.first(email: email)
    if user # FIXME: and not user.identity['provider'] == 'facebook'
      user.identity = {
        provider: auth.provider,
        uid:      auth.uid,
        token:    auth.credentials.token
      }
      user.save
    else
      user = User.create(
        name:      "#{auth.info.first_name} #{auth.info.last_name}",
        email:     email,
        joined_on: DateTime.now,
        identity:  {
          provider: auth.provider,
          uid:      auth.uid,
          token:    auth.credentials.token
        })
    end
    token = AccessToken.generate(user)
    request.session[:token] = token
    user.to_json only: [:id, :name, :picture, :joined_on]
  end

  get '/auth/failure' do
    params[:message]
  end

  ## /3rd party authentication

  post '/signout' do
    token = request.session.delete(:token)
    AccessToken.destroy(token)
    200
  end

  get '/whoami' do
    content_type 'application/json'
    user = AccessToken.user(request.session[:token])
    halt 401 unless user
    user.to_json only: [:id, :name, :picture, :joined_on]
  end

  error KeyError do
    halt 400
  end

  def forward
    token = request.session[:token]
    halt 401 unless AccessToken.valid?(token)
    super
  end
end
