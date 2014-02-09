class Assets < App::Routes
  set :public_folder, 'www'

  def index
    send_file File.join(settings.public_folder, 'index.html')
  end

  get '/' do
    index
  end

  VIEWS = %w|about dashboard genome curate|

  VIEWS.each do |name|
    get "/#{name}" do
      index
    end
  end
end
