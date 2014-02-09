Sequel.migration do
  ### Curation tasks.
  up do
    create_table :curation_tasks  do

      foreign_key :id, :tasks,
        primary_key: true,
        on_delete:   :cascade
    end
  end

  down do
    drop_constraint_validations_for table: :curation_tasks
    drop_table :curation_tasks
  end
  ### /Curation tasks.
end
