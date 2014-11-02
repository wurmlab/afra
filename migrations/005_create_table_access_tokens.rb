Sequel.migration do
  up do
    create_table :access_tokens  do

      foreign_key :for_user_id, :users,
        null:        false,
        on_delete:   :cascade

      column   :token, :uuid,
        default:     Sequel.function(:uuid_generate_v4),
        primary_key: true

      column   :expires_on, 'timestamp with time zone',
        default:     Sequel.function(:now) + Sequel.lit("interval '30 days'"),
        null:        false
    end
  end

  down do
    drop_constraint_validations_for table: :access_tokens
    drop_table :access_tokens
  end
end
