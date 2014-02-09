Sequel.migration do
  up do
    create_table :users  do

      column   :id,  :uuid,
        default:     Sequel.function(:uuid_generate_v4),
        primary_key: true

      String   :name,
        null:   false
      validate do
        min_length 3, :name
      end

      String   :email,
        null:    false,
        unique:  true
      validate do
        format /\y[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\y/i, :email
      end

      String   :password  # encrypted

      DateTime :joined_on


      # identity = {provider: ..., uid: ...}
      column   :identity, :json,
        default: Sequel.pg_json({})
    end
  end

  down do
    drop_constraint_validations_for table: :users
    drop_table :users
  end
end
