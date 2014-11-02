Sequel.migration do
  up do
    create_table :genomes  do

      primary_key :id

      String      :species,
        null:      false

      String      :asm_id,
        null:      false

      # FIXME: species + asm_id => unique

      column      :created_at, 'timestamp with time zone',
        null:      false,
        default:   Sequel.function(:now)
    end
  end

  down do
    drop_constraint_validations_for table: :genomes
    drop_table :genomes
  end
end
