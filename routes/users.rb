class Users < App::Routes
  before do
    content_type 'application/json'
  end

  get '/data/users/:id' do
    'test'
  end

  get '/data/users/:id/contributions' do |id|
    contribution = Gene::UserCreated.where from_user_id: id
    contribution.to_json only: [:task_type, :description, :status, :submitted_at]
  end
end
