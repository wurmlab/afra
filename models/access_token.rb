# A session token is issued to a user and expires after a given period of
# time.
class AccessToken < Sequel::Model

  many_to_one :user

  class << self
    def generate(user)
      t = create(user_id: user.id)
      t.token
    end

    def destroy(token)
      t = with_pk(token)
      t and t.destroy
    end

    def valid?(token)
      t = with_pk(token)
      t and t.expires_on >= Time.now
    end

    def user(token)
      t = with_pk(token)
      t and t.user
    end
  end
end
