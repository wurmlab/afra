class Task < Sequel::Model

  many_to_many  :features

  one_to_many   :contributions

  plugin        :class_table_inheritance,
    key:         :type

  def tracks
    features.first.tracks
  end

  class << self
    def give(to: nil)
      raise "Task can only be given 'to' a User" unless to.is_a? User
      available_tasks = where(id: to.tasks.map(&:id)).invert.where(state: 'ready')
      available_tasks_with_highest_priority = available_tasks.where(priority: available_tasks.max(:priority))
      task = available_tasks_with_highest_priority.offset(Sequel.function(:floor, Sequel.function(:random) * available_tasks_with_highest_priority.count)).first
      task.set_running_state
    end
  end

  def register_submission(submission, from: nil)
    yield
    register_user_contribution from
    #if contributions.count == 3 # and type == 'curation'
      #set_
    #else
      increment_priority and set_ready_state and save
    #end
  end

  def auto_check
    submissions.each_cons(2) do |s1, s2|
      return false unless s1 == s2
    end
    true
  end

  def set_ready_state
    self.state = 'ready'
    self
  end

  def set_running_state
    self.state = 'running'
    self
  end

  def increment_priority
    self.priority += 1
    self
  end

  def register_user_contribution(from)
    raise "Submission should come 'from' a User" unless from.is_a? User
    Contribution.create user_id: from.id, task_id: id
  end
end

class CurationTask < Task

  one_to_many   :submissions,
    class: :UserCreatedFeature

  def register_submission(submission, from: nil)
    super do
      # The id of the submissions can be ignored. And assuming the submission
      # comprises only one gene model.
      submission = submission.values.first.values.first

      feature = UserCreatedFeature.new({
        name:        submission['name'],
        ref:         submission['ref'],
        start:       submission['start'],
        end:         submission['end'],
        subfeatures: submission['subfeatures'].map do |subfeature|
          subfeature = subfeature.values.first
          {start: subfeature['start'], end: subfeature['end']}
        end,
        curation_task_id: self.id
      })
      feature.save
    end
  end
end
