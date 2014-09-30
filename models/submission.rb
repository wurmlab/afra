class Submission < Sequel::Model

  many_to_one :task

  many_to_one :user

  def task_type
    "CurationTask"
  end

  def description
    "Curated #{for_task.ref}:#{for_task.start}..#{for_task.end}."
  end
end
