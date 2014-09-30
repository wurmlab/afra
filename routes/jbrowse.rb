class JBrowse < App::Routes

  use Rack::Sendfile

  def data_dir
    @data_dir ||= File.expand_path 'data/jbrowse'
  end

  get  '/data/jbrowse/*' do |path|
    send_file File.join(data_dir, path)
  end
end
