require 'ruby-saml'

class SAML < App::Routes

  def saml_settings
    return @settings if @settings

    @settings = OneLogin::RubySaml::IdpMetadataParser.new.parse(File.read('/home/afra/src/qm.saml'))
    @settings.assertion_consumer_service_url = 'http://afra.sbcs.qmul.ac.uk/saml/acsu'
    @settings.issuer = 'http://afra.sbcs.qmul.ac.uk/saml/meta'

    p @settings
    @settings
  end

  get '/saml/login' do
    saml_request = OneLogin::RubySaml::Authrequest.new
    redirect saml_request.create(saml_settings)
  end

  get '/saml/acsu' do
    saml_response = OneLogin::RubySaml::Response.new(params[:SAMLResponse], :settings => settings)
    p saml_response
  end

  get '/saml/meta' do
    saml_meta = OneLogin::RubySaml::Metadata.new
    p saml_meta
  end
end
