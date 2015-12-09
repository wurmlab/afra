require 'onelogin/ruby-saml'

class Auth < App::Routes

  use Rack::Session::Cookie,
    key:          'afra.session',
    secret:       Setting.get('session_secret'),
    expire_after: 2592000 # 1 month

  def saml_settings
    # https://qmul.corefacilities.org/account/saml/qml

    # From https://idp.shibboleth.qmul.ac.uk/idp/shibboleth:
    # <NameIDFormat>
    #   urn:oasis:names:tc:SAML:2.0:nameid-format:transient
    # </NameIDFormat>
    # <SingleSignOnService Binding="urn:mace:shibboleth:1.0:profiles:AuthnRequest" Location="https://idp.shibboleth.qmul.ac.uk/idp/profile/Shibboleth/SSO"/>
    # <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.shibboleth.qmul.ac.uk/idp/profile/SAML2/POST/SSO"/>
    # <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST-SimpleSign" Location="https://idp.shibboleth.qmul.ac.uk/idp/profile/SAML2/POST-SimpleSign/SSO"/>
    # <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.shibboleth.qmul.ac.uk/idp/profile/SAML2/Redirect/SSO"/>

    #idp_metadata_parser = OneLogin::RubySaml::IdpMetadataParser.new
    #settings = idp_metadata_parser.parse 'qm.saml.xml'

    settings = OneLogin::RubySaml::Settings.new
    settings.idp_sso_target_url             = "https://idp.shibboleth.qmul.ac.uk:8443/idp/profile/SAML2/SOAP/ArtifactResolution"
    settings.issuer                         = "http://#{request.host}:#{request.port}/saml_init"
    settings.assertion_consumer_service_url = "http://#{request.host}:#{request.port}/saml_signin"
    #settings.name_identifier_format         = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" # onelogin's readme
    settings.name_identifier_format         = "urn:oasis:names:tc:SAML:2.0:nameid-format:transient"
    settings
  end

  def authorization_correct?(authorization)
    authorization = authorization.split
    # TODO
  end

  get '/saml_init' do
    p 'here'
    request = OneLogin::RubySaml::Authrequest.new
    p to(request.create(saml_settings))
    redirect(to(request.create(saml_settings)))
  end

  post '/saml_signin' do
    response = OneLogin::RubySaml::Response.new(params[:SAMLResponse], settings: saml_settings)
    p response
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
