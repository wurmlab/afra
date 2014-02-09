class Setting < Sequel::Model

  unrestrict_primary_key

  def self.get(key)
    with_pk!(key).value
  rescue
    raise "#{key} is either not defined or not set."
  end
end
