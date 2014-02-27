Sequel.migration do

  up do
    create_join_table feature_id: :features, task_id: :tasks
      #foreign_key :feature_id, :features,
        #on_delete: :cascade
  end

  down do
    drop_constraint_validations_for table: :features_tasks
    drop_table :features_tasks
  end
end
