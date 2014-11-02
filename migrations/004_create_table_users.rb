Sequel.migration do
  up do
    create_table :users  do

      ##
      # 1. Validating user details derived from Facebook login would be
      # redundant.
      ##

      primary_key :id

      String   :name,
        null:   false

      String   :email,
        null:    false,
        unique:  true

      String   :picture,
        null:    false,
        unique:  true

      column   :joined_on, 'timestamp with time zone',
        default: Sequel.function(:now)
    end
  end

  down do
    drop_constraint_validations_for table: :users
    drop_table :users
  end
end
