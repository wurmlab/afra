Sequel.migration do
  up do
    create_table :submissions  do

      foreign_key :task_id,  :tasks,
        null:      false,
        on_delete: :cascade

      foreign_key :user_id,  :users,
        null:      false,
        on_delete: :restrict

      DateTime    :submitted_at,
        null:      false,
        default:   Sequel.function(:now)

      DateTime    :updated_at,
        null:      false,
        default:   Sequel.function(:now)

      String      :status,
        null:      false,
        default:   'submitted'
      validate do
        includes %w|submitted accepted rejected|, :status
      end

      # data = {
      #   type:  ...,
      #   value: ...
      # }
      # FIXME: validation
      column      :data, :json,
        default:   Sequel.pg_json({})
    end
  end

  down do
    drop_constraint_validations_for table: :submissions
    drop_table :submissions
  end
end
