Sequel.migration do

  ### Tasks super table.
  up do
    create_table :tasks  do

      primary_key :id

      foreign_key :feature_id, :features,
        on_delete: :cascade

      String      :type,
        null:      false
      validate do
        includes %w|CurationTask|, :type
      end

      Integer     :priority,
        null:      false,
        default:   0

      Integer     :difficulty,
        null:      false,
        default:   0

      String      :state,
        null:      false,
        default:   'ready'
      validate do
        includes %w|ready running auto-check|, :state
      end

      DateTime    :created_at,
        null:      false,
        default:   Sequel.function(:now)
    end
  end

  down do
    drop_constraint_validations_for table: :tasks
    drop_table :tasks
  end
  ### /Tasks super table.
end
