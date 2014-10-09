require 'yaml'
require 'date'

class Task < Sequel::Model

  many_to_one :ref_seq

  one_to_many :submissions

  class << self
    def distribution_dataset
      db[:task_distribution]
    end

    def give(to: nil)
      raise "Task can only be given 'to' a User" unless to.is_a? User

      # First check if a task was already assigned to the user.
      if t = distribution_dataset.where(user_id: to.id).first
        return Task.with_pk(t[:task_id])
      end

      # Assign user a new task.
      available_tasks = where(id: to.tasks.map(&:id)).invert.where(state: 'ready').where(difficulty: 1)
      available_tasks_with_highest_priority = available_tasks.where(priority: available_tasks.max(:priority))
      task = available_tasks_with_highest_priority.offset(Sequel.function(:floor, Sequel.function(:random) * available_tasks_with_highest_priority.count)).first
      task.set_running_state and task.add_to_distributed_list(to)
    end
  end

  def register_submission(data, user)
    Task.db.transaction do
      Submission.create data: data, task_id: self.id, user_id: user.id
      increment_priority and set_ready_state and remove_from_distributed_list(user)
    end
  end

  def update_submission(data, user)
    submission = filter_submission from: user
    return unless submission
    Task.db.transaction do
      submission.data = data
      submission.save
      set_ready_state and remove_from_distributed_list(user)
    end
  end

  def filter_submission(from:)
    submissions.find{|s| from == s.user}
  end

  def auto_check
    submissions.each_cons(2) do |s1, s2|
      return false unless s1 == s2
    end
    true
  end

  def set_ready_state
    self.state = 'ready'
    self.save
    self
  end

  def set_running_state
    self.state = 'running'
    self.save
    self
  end

  def distribution_dataset
    self.class.distribution_dataset
  end

  def add_to_distributed_list(user)
    distribution_dataset.insert(task_id: self.id, user_id: user.id)
    self
  end

  # Remove from distribution list if present.
  def remove_from_distributed_list(user)
    entry = distribution_dataset.where(task_id: self.id, user_id: user.id)
    entry.delete if entry.first
    self
  end

  def increment_priority
    self.priority += 1
    self.save
    self
  end
end
