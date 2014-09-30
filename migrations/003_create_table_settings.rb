Sequel.migration do
  up do
    create_table :settings  do

      String        :key,
        null:        false,
        primary_key: true

      String        :value

      validate do
        config_keys = ["session_secret",
                       "session_ttl",
                       "facebook_app_id",
                       "facebook_app_secret"]

        includes config_keys, :key
      end
    end
  end

  down do
    drop_constraint_validations_for table: :settings
    drop_table :settings
  end
end
