Sequel.migration do
  up do
    create_constraint_validations_table
  end

  down do
    drop_constraint_validations_table
  end
end
