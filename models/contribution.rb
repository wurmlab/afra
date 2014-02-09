class Contribution < Sequel::Model

  many_to_one :task

  many_to_one :user

  def task_type
    task.type
  end

  def description
    "Curated #{task.feature.ref}:#{task.feature.start}..#{task.feature.end}."
  end
end
