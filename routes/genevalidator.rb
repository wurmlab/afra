class GV < App::Routes

  def data_dir
    @data_dir ||= File.expand_path 'data/genevalidator'
  end

  get  '/genevalidator/:id/?' do |id|
    index = File.join(data_dir, id, 'html', 'index.html')
    send_file index
  end

  get  '/genevalidator/:id/*' do |id, path|
    send_file File.join(data_dir, id, 'html', path)
  end
end
