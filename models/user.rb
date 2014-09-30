require 'bcrypt'

class User < Sequel::Model

  one_to_many  :access_token,
    key:        :for_user_id

  one_to_many  :submissions

  def tasks
    submissions.map(&:task)
  end
end
