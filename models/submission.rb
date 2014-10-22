class Submission < Sequel::Model

  many_to_one :task

  many_to_one :user

  def description
    "Corrections to #{task.ref_seq.species} gene."
  end
end
