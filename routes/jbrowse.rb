class JBrowse < App::Routes

  def data_dir
    @data_dir ||= File.expand_path 'data/jbrowse'
  end

  get  '/data/jbrowse/*' do |path|
    send_file File.join(data_dir, path)
  end

  get '/features/:query' do |query|
    #ref, coords = query.split(':')
    #start, _end = coords.split('..').map{|coord| Integer coord}
    [Feature.last].to_json
    #[{start: start, end: _end}].to_json
  end
end
