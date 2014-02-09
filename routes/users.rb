class Users < App::Routes
  before do
    content_type 'application/json'
  end

  get '/data/users/:id' do
    'test'
  end

  get '/data/users/:id/contributions' do |id|
    contribution = Contribution.where user_id: id
    contribution.to_json only: [:task_type, :description, :status, :attempted_at]
  end
end
