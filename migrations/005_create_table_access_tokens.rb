Sequel.migration do
  up do
    create_table :access_tokens  do

      foreign_key :user_id, :users,
        type:        :uuid,
        null:        false,
        on_delete:   :cascade

      column   :token, :uuid,
        default:     Sequel.function(:uuid_generate_v4),
        primary_key: true

      DateTime :expires_on,
        default:     Sequel.function(:now) + Sequel.lit("interval '30 days'"),
        null:        false
    end
  end

  down do
    drop_constraint_validations_for table: :access_tokens
    drop_table :access_tokens
  end
end
