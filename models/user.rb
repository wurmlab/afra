require 'bcrypt'

class User < Sequel::Model

  one_to_many  :access_token

  one_to_many  :contributions
  many_to_many :tasks,
    join_table: :contributions

  def password=(plain)
    super BCrypt::Password.create plain
  end

  def authenticate(plain)
    BCrypt::Password.new(password) == plain
  end

  def picture
    if identity['provider'] == 'facebook'
      "http://graph.facebook.com/#{identity['uid']}/picture?type=large"
    end
  end
end
