require 'json'

class Tasks < App::Routes

  def task_data task, user
    data = {
      id:      task.id,
      refSeqs: [
        {
          start:  0,
          end:    task.ref_seq.length,
          length: task.ref_seq.length,
          name:   task.ref_seq.seq_id,
          seqChunkSize: RefSeq::CHUNK_SIZE
        }
      ],
      baseUrl: "data/jbrowse/#{task.ref_seq.species}/#{task.ref_seq.asm_id}/",
      include: ["data/jbrowse/#{task.ref_seq.species}/#{task.ref_seq.asm_id}/trackList.json", "data/jbrowse/edit-track.json"],
      start:   task.start,
      end:     task.end
    }

    if s = task.filter_submission(from: user)
      data[:stores] = {
        "scratchpad" => {
          type: "JBrowse/Store/SeqFeature/ScratchPad",
          features: s.data["value"]
        }
      }
    end

    data
  end

  before do
    content_type 'application/json'
  end

  # Give user a new task at random or the last task she was on.
  get '/data/tasks/next' do
    user = AccessToken.user(request.session[:token])
    task = Task.give to: user

    task_data(task, user).to_json
  end

  # Give user a task by the requested id. This is so that users can revise
  # their submission.
  #
  # FIXME: allow this URL only if the user has attempted this task already.
  get  '/data/tasks/:id' do |id|
    user = AccessToken.user(request.session[:token])
    task = Task.with_pk id

    task_data(task, user).to_json
  end

  # Save new or update existing submission made by the user.
  post '/data/tasks/:id' do
    data = JSON.parse request.body.read
    user = AccessToken.user(request.session[:token])
    task = Task.with_pk params[:id]
    task.update_submission(data, user) or
      task.register_submission(data, user)
    200
  end
end
