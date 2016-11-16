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
      # list at a random offset and pick the task with the highest priority
      # from the resulting view.
      tasks_for_user_view = "tasks_for_user_#{user.id}".intern
      tasks_for_user = where(id: user.tasks.map(&:id)).invert.where(difficulty: 1)
      tasks_for_user = tasks_for_user.offset(rand(tasks_for_user.count))
      db.create_or_replace_view(tasks_for_user_view, tasks_for_user)

      tasks_for_user = db[tasks_for_user_view]
      task_for_user = tasks_for_user.where(priority: tasks_for_user.max(:priority))
      task_for_user = Task.with_pk(task_for_user.first[:id])
      db.drop_view(tasks_for_user_view)

      mark_assignment(task: task_for_user, user: user)
      task_for_user
    end

    # Save submission from a user. Automatically inserts or updates.
    def save_submission(task:, data:, user:)
      db.transaction do
        submission = task.filter_submissions user: user

        if not submission
          Submission.create data: data, task_id: task.id, user_id: user.id
          task.update(priority: task.priority + 1)
          mark_completion task: task, user: user
        else
          submission.update data: data, revised_on: DateTime.now
        end
      end
    end

    private

    # Note that the given task has been assigned to the given user.
    def mark_assignment(task:, user:)
      entry = distribution_dataset.where(task_id: task.id, user_id: user.id)
      raise "A task is already assigned to the user" if entry.count != 0 # won't happen
      distribution_dataset.insert(task_id: task.id, user_id: user.id)
    end

    # Note that the given task has been completed by the given user.
    def mark_completion(task:, user:)
      entry = distribution_dataset.where(task_id: task.id, user_id: user.id)
      raise "Task was not assigned to the user" if entry.count != 1 # won't happen
      entry.delete
    end
  end
end
