class Submission < Sequel::Model

  many_to_one :task

  many_to_one :user

  def task_type
    "CurationTask"
  end

  def description
    "Corrections to #{task.ref_seq.species} gene."
  end
end
