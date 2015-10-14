class Users < App::Routes
  before do
    content_type 'application/json'
  end

  get '/data/users' do
    User.all.to_json
  end

  get '/data/users/:id' do
    'test'
  end

  get '/data/users/:id/contributions' do |id|
    contribution = Submission.where user_id: id
    contribution.to_json only: [:status, :made_on],
      include: {task: {only: [:id, :for_species, :ref_seq_id, :start, :end]}}
  end
end
