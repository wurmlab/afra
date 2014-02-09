Sequel.migration do
  up do
    create_table :contributions  do

      primary_key :id

      foreign_key :user_id,                 :users,
        type:      :uuid,
        null:      false,
        on_delete: :cascade

      foreign_key :task_id,   :tasks,
        on_delete: :cascade

      DateTime    :attempted_at,
        null:      false,
        default:   Sequel.function(:now)

      String      :status,
        null:      false,
        default:   'submitted'
      validate do
        includes %w|submitted accepted rejected|, :status
      end
    end
  end

  down do
    drop_constraint_validations_for table: :contributions
    drop_table :contributions
  end
end
