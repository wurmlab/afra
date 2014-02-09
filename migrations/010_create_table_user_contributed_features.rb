Sequel.migration do
  up do
    create_table :user_created_features  do

      foreign_key :id, :features,
        primary_key: true,
        on_delete:   :cascade

      foreign_key :curation_task_id, :curation_tasks
        #on_delete:   :cascade
    end
  end

  down do
    drop_constraint_validations_for table: :user_created_features
    drop_table :user_created_features
  end
end
