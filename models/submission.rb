class Submission < Sequel::Model

  many_to_one :task

  many_to_one :user
end
