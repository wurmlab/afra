require 'yaml'
require 'date'

class Task < Sequel::Model

  many_to_one :ref_seq

  one_to_many :submissions

  def for_species
    ref_seq.species
  end

  # Return all submissions for this task by the given user.
  def filter_submissions(user:)
    submissions.find { |s| user == s.user }
  end

  class << self
    def distribution_dataset
      db[:task_distribution]
    end

    def give_to(user:)
      raise "Task can only be given to a User" unless user.is_a? User

      # If a task is already assigned to the user, give her the same task.
      if t = distribution_dataset.where(user_id: user.id).first
        return Task.with_pk(t[:task_id])
      end

      # Select tasks that haven't been done by the user already, subset the
      # list at a random offset and pick the task with the highest priority.
      available_tasks = where(id: user.tasks.map(&:id)).invert.where(difficulty: 1)
      available_tasks = available_tasks.offset(Sequel.function(:floor, Sequel.function(:random) * available_tasks.count))
      task = available_tasks.where(priority: available_tasks.max(:priority)).first

      # Book keeping.
      mark_assignment(task: task, user: user)

      task
    end

    # Save submission from a user. Automatically inserts or updates.
    def save_submission(task:, data:, user:)
      update_submission(task: task, data: data, user: user) or
        insert_submission(task: task, data: data, user: user)
    end

    private

    # Note that the given task has been assigned to the given user.
    def mark_assignment(task:, user:)
      distribution_dataset.insert(task_id: task.id, user_id: user.id)
    end

    # Note that the given task has been completed by the given user.
    def mark_completion(task:, user:)
      entry = distribution_dataset.where(task_id: task.id, user_id: user.id)
      entry.delete if entry.first
    end

    # Save a new submission from the user.
    def insert_submission(task:, data:, user:)
      db.transaction do
        Submission.create task_id: task.id, data: data, user_id: user.id
        mark_completion task: task, user: user
        bump_priority task: task
      end
    end

    # Update user submission.
    def update_submission(task:, data:, user:)
      submission = task.filter_submissions user: user
      return unless submission

      db.transaction do
        submission.revised_on = DateTime.now
        submission.data = data
        submission.save
      end
    end

    # Update priority of the given task by 1.
    def bump_priority(task:)
      task.priority += 1
      task.save
    end
  end
end
