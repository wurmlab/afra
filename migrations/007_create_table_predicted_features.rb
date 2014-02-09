Sequel.migration do
  up do
    create_table :predicted_features  do

      foreign_key :id, :features,
        primary_key: true,
        on_delete:   :cascade
    end
  end

  down do
    drop_constraint_validations_for table: :predicted_features
    drop_table :predicted_features
  end
end
