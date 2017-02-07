class Assets < App::Routes
  VIEWS = %w|/ /about /dashboard /genome /curate|

  VIEWS.each do |path|
    get path do
      erb :layout
    end
  end
end
