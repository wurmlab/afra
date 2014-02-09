class Tasks < App::Routes
  before do
    content_type 'application/json'
  end

  get '/data/tasks/next' do
    user = AccessToken.user(request.session[:token])
    task = Task.give to: user
    task.feature.to_json only: [:id, :ref, :start, :end, :tracks]
  end

  post '/data/tasks/:id' do
    submission = JSON.parse request.body.read
    user = AccessToken.user(request.session[:token])
    task = Task.with_pk params[:id]
    task.register_submission submission, from: user
    200
  end
end

