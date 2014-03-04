require 'bcrypt'

class User < Sequel::Model

  one_to_many  :access_token

  one_to_many  :contributions
  many_to_many :tasks,
    join_table: :contributions
end
