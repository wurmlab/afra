class Users < App::Routes
  before do
    content_type 'application/json'
  end

  get '/data/users/:id' do
    'test'
  end

  get '/data/users/:id/contributions' do |id|
    contribution = Submission.where user_id: id
    contribution.to_json only: [:status, :submitted_at],
      include: {task: {only: [:id, :for_species]}}
  end
end
