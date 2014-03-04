Sequel.migration do
  up do
    create_table :users  do

      ##
      # 1. Validating user details derived from Facebook login would be
      # redundant.
      ##

      column   :id,  :uuid,
        default:     Sequel.function(:uuid_generate_v4),
        primary_key: true

      String   :name,
        null:   false

      String   :email,
        null:    false,
        unique:  true

      String   :picture,
        null:    false,
        unique:  true

      DateTime :joined_on
    end
  end

  down do
    drop_constraint_validations_for table: :users
    drop_table :users
  end
end
