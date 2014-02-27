class Contribution < Sequel::Model

  many_to_one :task

  many_to_one :user

  def task_type
    task.type
  end

  def description
    "Curated #{task.ref}:#{task.start}..#{task.end}."
  end
end
