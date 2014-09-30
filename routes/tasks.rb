require 'json'

class Tasks < App::Routes

  before do
    content_type 'application/json'
  end

  get '/data/tasks/next' do
    user = AccessToken.user(request.session[:token])
    task = Task.give to: user

    {
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
    }.to_json
  end

  # FIXME: Ideally we would allow this URL only if the user has attempted
  # this task already.
  get  '/data/tasks/:id/:mode' do |id, mode|
    user = AccessToken.user(request.session[:token])
    task = Task.with_pk id

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

    case mode
    when 'revise'
      data[:tracks] = [{
        label: "user_#{user.id}",
        key:   user.name,
        type: 'JBrowse/View/Track/DraggableHTMLFeatures',
        store: "store_user_#{user.id}",
        style: {
          className: "transcript",
          subfeatureClasses: {
            three_prime_UTR: "three_prime_UTR",
            five_prime_UTR: "five_prime_UTR",
            CDS: "CDS",
            exon: "exon",
          }
        }
      }]
      data[:stores] = {
        "store_user_#{user.id}" => {
          type: "JBrowse/Store/SeqFeature/FromConfig",
          features: task.submission(from: user).data["value"]
        }
      }
    when 'review'
    end

    data.to_json
  end

  post '/data/tasks/:id' do
    submission = JSON.parse request.body.read
    user = AccessToken.user(request.session[:token])
    task = Task.with_pk params[:id]
    task.register_submission submission, from: user
    200
  end
end
