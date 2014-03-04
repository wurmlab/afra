class Auth < App::Routes

  use Rack::Session::Cookie,
    key:          'afra.session',
    secret:       Setting.get('session_secret'),
    expire_after: 2592000 # 1 month

  def authorization_correct?(authorization)
    authorization = authorization.split
    # TODO
  end

  post '/signin' do
    params = JSON.parse request.body.read
    halt 401 unless authorization_correct? params['authorization']
    email = params.fetch 'email'
    user  = User.first(email: email)
    unless user
      name    = params.fetch 'name'
      picture = params.fetch 'picture'
      user = User.create(name: name, email: email, picture: picture)
    end
    if user
      token = AccessToken.generate(user)
      request.session[:token] = token
      halt user.to_json only: [:id, :name, :picture, :joined_on]
    end
    401
  end

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
