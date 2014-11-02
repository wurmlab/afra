Sequel.migration do

  up do
    create_table :task_distribution do

      foreign_key :task_id, :tasks,
        on_delete: :cascade

      foreign_key :user_id, :users,
        on_delete: :cascade

      primary_key [:task_id, :user_id]

      column      :created_at, 'timestamp with time zone',
        null:      false,
        default:   Sequel.function(:now)
    end
  end

  down do
    drop_constraint_validations_for table: :task_distribution
    drop_table :task_distribution
  end
end
