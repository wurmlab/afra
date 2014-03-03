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
